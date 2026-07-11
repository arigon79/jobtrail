-- Per-job file attachments: resume, CV, cover letter, or any other document
-- tied to a single application. Files live in a private 'attachments' bucket.

create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  kind         text not null default 'resume'
                 check (kind in ('resume','cv','cover_letter','other')),
  label        text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   integer,
  uploaded_at  timestamptz not null default now()
);

create index if not exists attachments_job_idx on attachments(job_id);

-- Row Level Security: owner-only access.
alter table attachments enable row level security;

drop policy if exists attachments_select on attachments;
create policy attachments_select on attachments for select using (user_id = auth.uid());

drop policy if exists attachments_insert on attachments;
create policy attachments_insert on attachments for insert with check (user_id = auth.uid());

drop policy if exists attachments_update on attachments;
create policy attachments_update on attachments for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists attachments_delete on attachments;
create policy attachments_delete on attachments for delete using (user_id = auth.uid());

-- Private storage bucket. Object path convention: {user_id}/{job_id}/{attachment_id}.{ext}
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists attachments_obj_select on storage.objects;
create policy attachments_obj_select on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists attachments_obj_insert on storage.objects;
create policy attachments_obj_insert on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists attachments_obj_update on storage.objects;
create policy attachments_obj_update on storage.objects for update
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists attachments_obj_delete on storage.objects;
create policy attachments_obj_delete on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
