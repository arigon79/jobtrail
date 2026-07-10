'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function createContact(formData: FormData) {
  const { supabase, userId } = await uid();
  const name = String(formData.get('name') ?? '').trim();
  const companyId = String(formData.get('company_id') ?? '').trim();
  if (!name) throw new Error('Name is required');
  if (!companyId) throw new Error('Company is required');

  const { error } = await supabase.from('contacts').insert({
    user_id: userId,
    company_id: companyId,
    name,
    linkedin_url: String(formData.get('linkedin_url') ?? '').trim() || null,
    role: String(formData.get('role') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/contacts');
}

export async function deleteContact(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/contacts');
}
