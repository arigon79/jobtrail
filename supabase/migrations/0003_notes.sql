-- Sticky notes board. One row per note, owner-scoped via RLS like every
-- other table. Reuses the set_updated_at() trigger from 0001.

create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null default '',
  color      text not null default 'yellow'
               check (color in ('yellow','blue','green','pink','purple','cyan')),
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_pinned_idx on notes(user_id, pinned);

drop trigger if exists notes_set_updated_at on notes;
create trigger notes_set_updated_at
  before update on notes
  for each row execute function set_updated_at();

-- Row Level Security: owner-only, mirroring the other tables.
alter table notes enable row level security;

drop policy if exists notes_select on notes;
create policy notes_select on notes for select using (user_id = auth.uid());

drop policy if exists notes_insert on notes;
create policy notes_insert on notes for insert with check (user_id = auth.uid());

drop policy if exists notes_update on notes;
create policy notes_update on notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notes_delete on notes;
create policy notes_delete on notes for delete using (user_id = auth.uid());
