-- Harden the social layer. The security-definer helpers from 0005 are exposed by
-- PostgREST as RPC endpoints; revoke EXECUTE from anon/public so a logged-out user
-- can't call them (e.g. resolve a handle to a name via find_profile_by_handle).
-- authenticated keeps EXECUTE because the RLS policies + friend search run as that
-- role and evaluate these functions.

revoke execute on function are_friends(uuid, uuid) from public;
grant  execute on function are_friends(uuid, uuid) to authenticated;

revoke execute on function are_linked(uuid, uuid) from public;
grant  execute on function are_linked(uuid, uuid) to authenticated;

revoke execute on function can_see_event(uuid) from public;
grant  execute on function can_see_event(uuid) to authenticated;

revoke execute on function find_profile_by_handle(text) from public;
grant  execute on function find_profile_by_handle(text) to authenticated;

-- Pre-existing v1 lint: pin the trigger function's search_path.
alter function set_updated_at() set search_path = public;
