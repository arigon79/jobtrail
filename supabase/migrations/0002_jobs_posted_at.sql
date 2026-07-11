-- Add the date a job posting went live, so applications can be tracked
-- relative to when the role opened.
alter table jobs add column if not exists posted_at date;
