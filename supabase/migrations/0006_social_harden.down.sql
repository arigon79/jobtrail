-- Reverse 0006: restore the default PUBLIC execute grant on the helpers.
grant execute on function are_friends(uuid, uuid) to public;
grant execute on function are_linked(uuid, uuid) to public;
grant execute on function can_see_event(uuid) to public;
grant execute on function find_profile_by_handle(text) to public;
-- set_updated_at search_path left pinned (harmless; no clean revert value).
