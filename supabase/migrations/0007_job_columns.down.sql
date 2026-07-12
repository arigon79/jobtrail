-- Reverse 0007_job_columns.sql.
alter table jobs drop column if exists custom;
drop table if exists job_columns;
