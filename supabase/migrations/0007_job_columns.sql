-- User-defined Tracker columns. Each row defines an extra column the user added
-- to the jobs table; per-job values live in the new jobs.custom JSONB, keyed by
-- job_columns.id. All owner-scoped via RLS.

create table if not exists job_columns (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  type       text not null default 'text'
               check (type in ('text','number','date','select')),
  options    jsonb not null default '[]'::jsonb,   -- choices when type = 'select'
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists job_columns_user_idx on job_columns(user_id);

alter table job_columns enable row level security;

drop policy if exists job_columns_select on job_columns;
create policy job_columns_select on job_columns for select using (user_id = auth.uid());

drop policy if exists job_columns_insert on job_columns;
create policy job_columns_insert on job_columns for insert with check (user_id = auth.uid());

drop policy if exists job_columns_update on job_columns;
create policy job_columns_update on job_columns for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists job_columns_delete on job_columns;
create policy job_columns_delete on job_columns for delete using (user_id = auth.uid());

-- Per-job values for the custom columns: { "<job_columns.id>": "value", ... }.
alter table jobs add column if not exists custom jsonb not null default '{}'::jsonb;
