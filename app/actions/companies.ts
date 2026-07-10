'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function createCompany(formData: FormData) {
  const { supabase, userId } = await uid();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required');

  const { error } = await supabase.from('companies').insert({
    user_id: userId,
    name,
    website: (String(formData.get('website') ?? '').trim() || null),
    notes: (String(formData.get('notes') ?? '').trim() || null),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/companies');
}

export async function deleteCompany(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/companies');
}
