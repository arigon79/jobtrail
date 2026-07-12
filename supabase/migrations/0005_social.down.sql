-- Reverse 0005_social. Drops the social layer; v1 owner-only schema is unaffected.
-- Tables dropped child-first (reactions/comments -> feed_events; profiles/friendships last).

drop table if exists reactions;
drop table if exists comments;
drop table if exists feed_events;
drop table if exists friendships;
drop table if exists profiles;

drop function if exists can_see_event(uuid);
drop function if exists find_profile_by_handle(text);
drop function if exists are_linked(uuid, uuid);
drop function if exists are_friends(uuid, uuid);
