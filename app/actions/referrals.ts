'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { REFERRAL_STATUSES, type ReferralStatus } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function createReferral(formData: FormData) {
  const { supabase, userId } = await uid();
  const contactId = String(formData.get('contact_id') ?? '').trim();
  if (!contactId) throw new Error('Contact is required');

  const status = String(formData.get('status') ?? 'to_ask') as ReferralStatus;
  if (!REFERRAL_STATUSES.includes(status)) throw new Error('Invalid status');

  const { error } = await supabase.from('referrals').insert({
    user_id: userId,
    contact_id: contactId,
    job_id: String(formData.get('job_id') ?? '').trim() || null,
    status,
    asked_at: String(formData.get('asked_at') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/referrals');
  revalidatePath('/');
}

export async function updateReferralStatus(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const status = String(formData.get('status')) as ReferralStatus;
  if (!REFERRAL_STATUSES.includes(status)) throw new Error('Invalid status');

  const { error } = await supabase.from('referrals').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/referrals');
  revalidatePath('/');
}

export async function deleteReferral(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const { error } = await supabase.from('referrals').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/referrals');
}
