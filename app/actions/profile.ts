'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');

  const fullName = String(formData.get('full_name') ?? '').trim();

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName || null },
  });
  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout'); // refresh the avatar initial in the top bar
  redirect(`/profile?toast=${encodeURIComponent('Name updated')}`);
}

// --- Public profile row (v2 social layer, `profiles` table) ---

// A handle is the friend-discovery key: lowercase, letters/digits/underscore, 3-30 chars.
function normalizeHandle(raw: string): string {
  const h = raw.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(h)) {
    throw new Error('Handle must be 3-30 chars: letters, numbers, underscore');
  }
  return h;
}

export async function upsertProfile(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');

  const handle = normalizeHandle(String(formData.get('handle') ?? ''));
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!displayName) throw new Error('Display name is required');

  const str = (k: string): string | null => {
    const v = String(formData.get(k) ?? '').trim();
    return v || null;
  };

  const { error } = await supabase.from('profiles').upsert({
    id: data.user.id,
    handle,
    display_name: displayName,
    headline: str('headline'),
    current_company: str('current_company'),
    open_to_work: formData.get('open_to_work') === 'on',
    share_default: formData.get('share_default') === 'on',
  });
  // 23505 = unique_violation → the handle is taken by someone else
  if (error) {
    throw new Error(error.code === '23505' ? 'That handle is already taken' : error.message);
  }

  revalidatePath('/', 'layout');
  redirect(`/profile?toast=${encodeURIComponent('Profile saved')}`);
}

export async function setOpenToWork(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');

  const open = formData.get('open_to_work') === 'true';
  const { error } = await supabase
    .from('profiles')
    .update({ open_to_work: !open })
    .eq('id', data.user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/profile');
  revalidatePath('/feed');
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (password !== confirm) throw new Error('Passwords do not match');

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);

  redirect(`/profile?toast=${encodeURIComponent('Password changed')}`);
}
