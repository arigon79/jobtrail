-- Add "pinned" flag to jobs and companies so users can pin important rows.
-- Pinned rows sort to the top of their lists.

alter table jobs      add column if not exists pinned boolean not null default false;
alter table companies add column if not exists pinned boolean not null default false;

-- Speed up the "pinned first" ordering per user.
create index if not exists jobs_user_pinned_idx      on jobs(user_id, pinned);
create index if not exists companies_user_pinned_idx on companies(user_id, pinned);
