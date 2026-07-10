-- Rollback for 0002_pinned.sql

drop index if exists jobs_user_pinned_idx;
drop index if exists companies_user_pinned_idx;

alter table jobs      drop column if exists pinned;
alter table companies drop column if exists pinned;
