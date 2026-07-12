# Spec: Friend-Graph + Shared-Feed Data Model (JobTrail v2)

Extends the v1 single-user schema (see [SPEC.md](../../SPEC.md), [0001_init.sql](../../supabase/migrations/0001_init.sql)) with a social layer. Ships as migration `0005_social.sql` (next free number — v1 has colliding 0002/0003).

## Design principles

1. **Private tracker stays owner-only.** `jobs`, `interviews`, `contacts`, etc. keep their `user_id = auth.uid()` RLS unchanged. Friends never read them directly.
2. **The feed is a denormalized snapshot table.** A shareable action writes a `feed_events` row containing only what should be public-to-friends (company + role as *text*, not FKs into private data). One wrong flag can't leak salary/notes because those columns aren't in the feed table.
3. **Explicit share, not auto-mirror.** Nothing reaches the feed unless the user opts in per event. Simplest privacy story; matches the "will friends share the hard stuff" assumption.
4. **Mutual friendship, not followers.** Symmetric, accepted-both-ways. Keeps visibility trust-based and simple.

## Friend visibility rule (the linchpin)

A single security-definer helper decides "can A see B's social content." Every social policy reuses it.

```sql
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
```

`security definer` lets it read `friendships` regardless of the caller's RLS — it only ever returns a boolean, so it leaks nothing. Never call it inside `friendships`' own policies (recursion); those use direct `auth.uid()` checks.

## Tables

### `profiles` — public-to-friends identity
Auth users aren't readable by other users, so a friend's name/handle must live here.

```sql
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  handle         text not null unique,            -- @handle, for invite/search
  display_name   text not null,
  headline       text,                            -- "New grad SWE, open to work"
  avatar_url     text,                            -- nullable; initials fallback in UI
  current_company text,                           -- powers the referral hint
  open_to_work   boolean not null default false,
  share_default  boolean not null default false,  -- pre-check the share toggle
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

Visibility: a row is readable by the owner **or** anyone with a friendship link — including a still-*pending* request, so an incoming request can show the requester's name before it's accepted. This uses `are_linked` (any status), not `are_friends` (accepted-only); feed/reactions/comments stay accepted-only. Writable only by the owner.

```sql
alter table profiles enable row level security;

create policy profiles_select on profiles for select
  using (id = auth.uid() or are_linked(auth.uid(), id));
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
```
> Note: handle-search for *new* friends needs a narrow lookup that bypasses "friends-only" (you're not friends yet). Do that via a `security definer` RPC (`find_profile_by_handle`) returning only `{id, handle, display_name, avatar_url}` — not by loosening the select policy.

### `friendships` — the mutual graph
One row per relationship, requester → addressee, with a normalized-pair unique index so A↔B can't be duplicated in either direction.

```sql
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

create unique index if not exists friendships_pair_uniq on friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on friendships(addressee_id, status);
```

Visibility: either party can see and act on the row.

```sql
alter table friendships enable row level security;

create policy friendships_select on friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
-- requester creates the pending request
create policy friendships_insert on friendships for insert
  with check (requester_id = auth.uid());
-- either party updates status (addressee accepts/blocks; requester cancels)
create policy friendships_update on friendships for update
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_delete on friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());
```
> App rule (not enforceable cheaply in SQL): only the *addressee* should move `pending → accepted`. Enforce in the server action.

### `feed_events` — the shared activity snapshot
Written by a server action when the user shares an update. Snapshots text, not private FKs.

```sql
create table if not exists feed_events (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references auth.users(id) on delete cascade,
  verb         text not null
                 check (verb in ('applied','interview','offer','accepted',
                   'rejected','open_to_work','custom')),
  company_name text,              -- snapshot, denormalized on purpose
  role         text,              -- snapshot
  body         text,              -- optional free note ("2nd round Friday 🤞")
  job_id       uuid references jobs(id) on delete set null,  -- owner-only backlink
  visibility   text not null default 'friends'
                 check (visibility in ('friends')),  -- room to add 'public' later
  created_at   timestamptz not null default now()
);

create index if not exists feed_events_actor_idx on feed_events(actor_id, created_at desc);
```

Visibility: owner or accepted friend can read; only the actor writes/edits/deletes.

```sql
alter table feed_events enable row level security;

create policy feed_events_select on feed_events for select
  using (actor_id = auth.uid() or are_friends(auth.uid(), actor_id));
create policy feed_events_insert on feed_events for insert
  with check (actor_id = auth.uid());
create policy feed_events_update on feed_events for update
  using (actor_id = auth.uid()) with check (actor_id = auth.uid());
create policy feed_events_delete on feed_events for delete
  using (actor_id = auth.uid());
```

### `reactions` and `comments` — engagement on events
Both gated on "can you see the underlying event" via `are_friends` against the event's actor.

```sql
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
```

Reuse a helper so policies stay readable:

```sql
create or replace function can_see_event(evt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from feed_events e
    where e.id = evt
      and (e.actor_id = auth.uid() or are_friends(auth.uid(), e.actor_id))
  );
$$;

alter table reactions enable row level security;
create policy reactions_select on reactions for select using (can_see_event(event_id));
create policy reactions_insert on reactions for insert
  with check (user_id = auth.uid() and can_see_event(event_id));
create policy reactions_delete on reactions for delete using (user_id = auth.uid());

alter table comments enable row level security;
create policy comments_select on comments for select using (can_see_event(event_id));
create policy comments_insert on comments for insert
  with check (user_id = auth.uid() and can_see_event(event_id));
create policy comments_update on comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete on comments for delete using (user_id = auth.uid());
```

## Reads (how the feed is built)
- **Home feed:** `select * from feed_events order by created_at desc limit N` — RLS already restricts to self + friends. One indexed table scan, no joins into private data. Hydrate actor via `profiles`, counts via `reactions`/`comments`.
- **Referral hint:** on add-job at company X, `select id, display_name from profiles where current_company ilike X` — RLS returns only friends. If any, surface "Ari works here — ask for a referral?"

## Writes (server-action flow)
Follows the existing `app/actions/*.ts` pattern (`uid()` gate, `str()` helper, `revalidatePath`).
- New file `app/actions/social.ts`: `sendFriendRequest`, `respondToFriendRequest`, `removeFriend`, `shareEvent(verb, company, role, body)`, `reactToEvent`, `unreact`, `addComment`, `deleteComment`.
- New file `app/actions/profile.ts` gains `upsertProfile`, `setOpenToWork`.
- **Sharing is explicit:** the "Share to feed" control on a job status change calls `shareEvent`, which inserts one `feed_events` row. Auto-mirroring `jobs` → feed is deliberately **out** (privacy + simplicity).

## Types (`lib/types.ts` additions)
```ts
export const FEED_VERBS = ['applied','interview','offer','accepted','rejected','open_to_work','custom'] as const;
export type FeedVerb = (typeof FEED_VERBS)[number];
export const FRIENDSHIP_STATUSES = ['pending','accepted','blocked'] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];
// + interfaces: Profile, Friendship, FeedEvent, Reaction, Comment
```

## Storage
- Avatars: **out for MVP** — render initials. When added, a public `avatars` bucket, path `{user_id}/avatar.{ext}`, owner-only write / public read.

## Open questions carried from the one-pager
- Sharing granularity confirmed as **per-event explicit** (with `profiles.share_default` to pre-check the toggle). Revisit "close friends" tiers only if users ask.
- Friend discovery: **handle search via `find_profile_by_handle` RPC + invite link**. Email search deferred (privacy).
- Blocking: `friendships.status = 'blocked'` reserved in the schema but block UX is out of MVP.

## Migration checklist
- [ ] Write `supabase/migrations/0005_social.sql` (tables + functions + policies above) and paired `0005_social.down.sql`.
- [ ] Mirror enums/rows in `lib/types.ts`.
- [ ] Backfill: create a `profiles` row for the existing user (handle + display_name) — the app can't function socially without one.
- [ ] Verify RLS with a second auth user: friend request → accept → sees shared events only; non-friend sees zero.
