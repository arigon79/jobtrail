'use server';

import { revalidatePath } from 'next/cache';
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

  revalidatePath('/', 'layout');
  revalidatePath('/settings');
}
