-- Reverse of 0001_init.sql. Destroys all app data — export first if needed.

drop policy if exists resumes_obj_select on storage.objects;
drop policy if exists resumes_obj_insert on storage.objects;
drop policy if exists resumes_obj_update on storage.objects;
drop policy if exists resumes_obj_delete on storage.objects;
delete from storage.buckets where id = 'resumes';

drop table if exists referrals;
drop table if exists contacts;
drop table if exists interviews;
drop table if exists jobs;
drop table if exists resumes;
drop table if exists companies;

drop function if exists set_updated_at();
