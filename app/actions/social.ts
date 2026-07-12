'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { FEED_VERBS, type FeedVerb } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

function str(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? '').trim();
  return v || null;
}

// --- Friend graph ---

export async function sendFriendRequest(formData: FormData) {
  const { supabase, userId } = await uid();
  const handle = String(formData.get('handle') ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!handle) throw new Error('Handle is required');

  // security-definer RPC: we aren't friends yet, so the friends-only select
  // policy on profiles would otherwise hide the target.
  const { data: target, error: lookupErr } = await supabase
    .rpc('find_profile_by_handle', { h: handle })
    .maybeSingle<{ id: string }>();
  if (lookupErr) throw new Error(lookupErr.message);
  if (!target) throw new Error(`No user @${handle}`);
  if (target.id === userId) throw new Error("You can't friend yourself");

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: target.id });
  // 23505 = the normalized-pair unique index → a request/friendship already exists
  if (error) {
    throw new Error(error.code === '23505' ? 'You already have a request or friendship with them' : error.message);
  }

  revalidatePath('/friends');
}

export async function respondToFriendRequest(formData: FormData) {
  const { supabase, userId } = await uid();
  const id = String(formData.get('id') ?? '');
  const accept = formData.get('accept') === 'true';
  if (!id) throw new Error('Missing request id');

  if (accept) {
    // Only the addressee may accept a still-pending request.
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', id)
      .eq('addressee_id', userId)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
  } else {
    // Decline = remove the pending row (addressee only).
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', id)
      .eq('addressee_id', userId)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
  }

  revalidatePath('/friends');
  revalidatePath('/feed');
}

export async function removeFriend(formData: FormData) {
  const { supabase, userId } = await uid();
  const friendId = String(formData.get('friend_id') ?? '');
  if (!friendId) throw new Error('Missing friend id');

  // Delete the relationship from whichever direction it was created.
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),` +
      `and(requester_id.eq.${friendId},addressee_id.eq.${userId})`,
    );
  if (error) throw new Error(error.message);

  revalidatePath('/friends');
  revalidatePath('/feed');
}

// --- Shared feed ---

export async function shareEvent(formData: FormData) {
  const { supabase, userId } = await uid();
  const verb = String(formData.get('verb') ?? 'custom') as FeedVerb;
  if (!FEED_VERBS.includes(verb)) throw new Error('Invalid verb');

  const body = str(formData, 'body');
  // A 'custom' post needs some text; the others can stand on company + role alone.
  if (verb === 'custom' && !body) throw new Error('Say something to share');

  const { error } = await supabase.from('feed_events').insert({
    actor_id: userId,
    verb,
    company_name: str(formData, 'company_name'),
    role: str(formData, 'role'),
    body,
    job_id: str(formData, 'job_id'),
  });
  if (error) throw new Error(error.message);

  revalidatePath('/feed');
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing event id');

  // RLS restricts delete to the actor; no extra guard needed.
  const { error } = await supabase.from('feed_events').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/feed');
}

// --- Reactions + comments ---

export async function reactToEvent(formData: FormData) {
  const { supabase, userId } = await uid();
  const eventId = String(formData.get('event_id') ?? '');
  if (!eventId) throw new Error('Missing event id');
  const emoji = str(formData, 'emoji') ?? '👏';

  // Idempotent: a repeat of the same emoji collides on the unique index → ignore.
  const { error } = await supabase
    .from('reactions')
    .insert({ user_id: userId, event_id: eventId, emoji });
  if (error && error.code !== '23505') throw new Error(error.message);

  revalidatePath('/feed');
}

export async function unreact(formData: FormData) {
  const { supabase, userId } = await uid();
  const eventId = String(formData.get('event_id') ?? '');
  if (!eventId) throw new Error('Missing event id');
  const emoji = str(formData, 'emoji') ?? '👏';

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('emoji', emoji);
  if (error) throw new Error(error.message);

  revalidatePath('/feed');
}

export async function addComment(formData: FormData) {
  const { supabase, userId } = await uid();
  const eventId = String(formData.get('event_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!eventId) throw new Error('Missing event id');
  if (!body) throw new Error('Comment is empty');

  // insert check enforces can_see_event(event_id) — non-friends are rejected by RLS.
  const { error } = await supabase
    .from('comments')
    .insert({ user_id: userId, event_id: eventId, body });
  if (error) throw new Error(error.message);

  revalidatePath('/feed');
}

export async function deleteComment(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing comment id');

  // RLS restricts delete to the comment author.
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/feed');
}
