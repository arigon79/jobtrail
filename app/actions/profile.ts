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
