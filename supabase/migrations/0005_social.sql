-- Social layer: friend graph + shared activity feed (JobTrail v2).
-- Extends the v1 owner-only schema. Private tables (jobs, interviews, …) are
-- untouched — friends never read them directly. Only feed_events, a denormalized
-- snapshot, crosses the friend boundary. See docs/specs/social-data-model.md.
--
-- NOTE: tables are created BEFORE the functions. LANGUAGE SQL function bodies are
-- validated at creation, so are_friends/can_see_event must come after the tables
-- they reference or the migration fails with "relation does not exist".

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles: friend-visible identity (auth.users is not readable by other users)
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text not null unique,
  display_name    text not null,
  headline        text,
  avatar_url      text,
  current_company text,                            -- powers the referral hint
  open_to_work    boolean not null default false,
  share_default   boolean not null default false,  -- pre-check the share toggle
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- friendships: one row per relationship, requester -> addressee
create table if not exists friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending','accepted','blocked')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- normalized-pair uniqueness: A<->B can't be duplicated in either direction
create unique index if not exists friendships_pair_uniq on friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on friendships(addressee_id, status);

-- feed_events: denormalized activity snapshot (text, not private FKs)
create table if not exists feed_events (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references auth.users(id) on delete cascade,
  verb         text not null
                 check (verb in ('applied','interview','offer','accepted',
                   'rejected','open_to_work','custom')),
  company_name text,
  role         text,
  body         text,
  job_id       uuid references jobs(id) on delete set null,  -- owner-only backlink
  visibility   text not null default 'friends'
                 check (visibility in ('friends')),
  created_at   timestamptz not null default now()
);

create index if not exists feed_events_actor_idx on feed_events(actor_id, created_at desc);

-- reactions + comments on feed events
create table if not exists reactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references feed_events(id) on delete cascade,
  emoji      text not null default '👏',
  created_at timestamptz not null default now(),
  unique (user_id, event_id, emoji)
);

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references feed_events(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_event_idx on comments(event_id, created_at);

-- ---------------------------------------------------------------------------
-- Functions (created AFTER their referenced tables)
-- security definer so they read friendships/feed_events regardless of caller RLS;
-- they only return booleans / minimal rows, so they leak nothing. Never call
-- are_friends/are_linked inside friendships' own policies (would recurse).
-- ---------------------------------------------------------------------------

-- accepted-only: used by feed/reactions/comments visibility
create or replace function are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and (   (f.requester_id = a and f.addressee_id = b)
           or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- any status (incl. pending): used only for profile reads, so a still-pending
-- request can show the other person's name before it's accepted.
create or replace function are_linked(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where (   (f.requester_id = a and f.addressee_id = b)
           or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- "can the caller see this event?" — reused by reactions/comments policies
create or replace function can_see_event(evt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from feed_events e
    where e.id = evt
      and (e.actor_id = auth.uid() or are_friends(auth.uid(), e.actor_id))
  );
$$;

-- handle lookup for friend discovery: you are NOT friends yet, so the friends-only
-- select policy on profiles would hide the target. Return only the minimum needed.
create or replace function find_profile_by_handle(h text)
returns table (id uuid, handle text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, p.display_name, p.avatar_url
  from profiles p
  where p.handle = h
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger for profiles (reuses set_updated_at from 0001_init)
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- profiles: owner or any friendship link (pending/accepted) may read; owner-only write
alter table profiles enable row level security;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or are_linked(auth.uid(), id));
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- friendships: either party may read/act; requester creates the request
alter table friendships enable row level security;
drop policy if exists friendships_select on friendships;
create policy friendships_select on friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists friendships_insert on friendships;
create policy friendships_insert on friendships for insert
  with check (requester_id = auth.uid());
drop policy if exists friendships_update on friendships;
create policy friendships_update on friendships for update
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists friendships_delete on friendships;
create policy friendships_delete on friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- feed_events: owner or accepted friend may read; actor-only write
alter table feed_events enable row level security;
drop policy if exists feed_events_select on feed_events;
create policy feed_events_select on feed_events for select
  using (actor_id = auth.uid() or are_friends(auth.uid(), actor_id));
drop policy if exists feed_events_insert on feed_events;
create policy feed_events_insert on feed_events for insert
  with check (actor_id = auth.uid());
drop policy if exists feed_events_update on feed_events;
create policy feed_events_update on feed_events for update
  using (actor_id = auth.uid()) with check (actor_id = auth.uid());
drop policy if exists feed_events_delete on feed_events;
create policy feed_events_delete on feed_events for delete
  using (actor_id = auth.uid());

-- reactions: visible if you can see the event; own rows only for write
alter table reactions enable row level security;
drop policy if exists reactions_select on reactions;
create policy reactions_select on reactions for select using (can_see_event(event_id));
drop policy if exists reactions_insert on reactions;
create policy reactions_insert on reactions for insert
  with check (user_id = auth.uid() and can_see_event(event_id));
drop policy if exists reactions_delete on reactions;
create policy reactions_delete on reactions for delete using (user_id = auth.uid());

-- comments: visible if you can see the event; own rows only for write
alter table comments enable row level security;
drop policy if exists comments_select on comments;
create policy comments_select on comments for select using (can_see_event(event_id));
drop policy if exists comments_insert on comments;
create policy comments_insert on comments for insert
  with check (user_id = auth.uid() and can_see_event(event_id));
drop policy if exists comments_update on comments;
create policy comments_update on comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists comments_delete on comments;
create policy comments_delete on comments for delete using (user_id = auth.uid());
