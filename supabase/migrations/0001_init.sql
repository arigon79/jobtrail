-- Job Application Tracker — initial schema
-- Run in Supabase SQL editor (or `supabase db push`).
-- Every table is scoped to the authenticated user via RLS on auth.uid().

-- ---------------------------------------------------------------------------
-- Tables (create order respects FK dependencies)
-- ---------------------------------------------------------------------------

create table if not exists companies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  website    text,
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  label        text not null,
  storage_path text not null,
  is_default   boolean not null default false,
  uploaded_at  timestamptz not null default now()
);

-- one resume per company (rows with null company_id may repeat = general resumes)
create unique index if not exists resumes_one_per_company
  on resumes(user_id, company_id) where company_id is not null;

create table if not exists jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  company_id     uuid references companies(id) on delete set null,
  role           text not null,
  job_link       text,
  location       text,
  remote         boolean not null default false,
  salary_range   text,
  status         text not null default 'to_apply'
                   check (status in ('to_apply','applied','oa','phone_screen',
                     'interview','final','offer','accepted','rejected',
                     'withdrawn','ghosted')),
  priority       text not null default 'med'
                   check (priority in ('low','med','high')),
  deadline       date,
  applied_at     date,
  follow_up_at   date,
  offer_amount   numeric,
  offer_currency text default 'USD',
  resume_id      uuid references resumes(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists interviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  round        text,
  kind         text check (kind in ('phone','technical','behavioral','onsite','other')),
  scheduled_at timestamptz,
  outcome      text check (outcome in ('pending','passed','failed','cancelled')),
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid not null references companies(id) on delete cascade,
  name         text not null,
  linkedin_url text,
  role         text,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists referrals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  job_id     uuid references jobs(id) on delete set null,
  status     text not null default 'to_ask'
               check (status in ('to_ask','asked','agreed','referred',
                 'declined','no_response')),
  asked_at   date,
  notes      text,
  created_at timestamptz not null default now()
);

-- helpful indexes for common filters
create index if not exists jobs_user_status_idx   on jobs(user_id, status);
create index if not exists jobs_user_company_idx  on jobs(user_id, company_id);
create index if not exists interviews_job_idx     on interviews(job_id);
create index if not exists contacts_company_idx   on contacts(company_id);
create index if not exists referrals_job_idx      on referrals(job_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for jobs
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only access on every table
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['companies','resumes','jobs','interviews','contacts','referrals']
  loop
    execute format('alter table %I enable row level security;', t);

    execute format($p$
      drop policy if exists %1$s_select on %1$I;
      create policy %1$s_select on %1$I for select using (user_id = auth.uid());
    $p$, t);

    execute format($p$
      drop policy if exists %1$s_insert on %1$I;
      create policy %1$s_insert on %1$I for insert with check (user_id = auth.uid());
    $p$, t);

    execute format($p$
      drop policy if exists %1$s_update on %1$I;
      create policy %1$s_update on %1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid());
    $p$, t);

    execute format($p$
      drop policy if exists %1$s_delete on %1$I;
      create policy %1$s_delete on %1$I for delete using (user_id = auth.uid());
    $p$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private "resumes" bucket + owner-only object policies
-- Object path convention: {user_id}/{company_id or 'general'}/{resume_id}.pdf
-- The first path segment is the user id, so we scope policies on it.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists resumes_obj_select on storage.objects;
create policy resumes_obj_select on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_obj_insert on storage.objects;
create policy resumes_obj_insert on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_obj_update on storage.objects;
create policy resumes_obj_update on storage.objects for update
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_obj_delete on storage.objects;
create policy resumes_obj_delete on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
