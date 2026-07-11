drop policy if exists attachments_obj_select on storage.objects;
drop policy if exists attachments_obj_insert on storage.objects;
drop policy if exists attachments_obj_update on storage.objects;
drop policy if exists attachments_obj_delete on storage.objects;
delete from storage.buckets where id = 'attachments';
drop table if exists attachments;
