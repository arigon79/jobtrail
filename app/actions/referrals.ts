'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

/**
 * Add a referral for a specific job. The person is either an existing contact
 * at the job's company (contact_id) or a brand-new one (new_name), which gets
 * created under that company and then becomes selectable everywhere.
 */
export async function addJobReferral(formData: FormData) {
  const { supabase, userId } = await uid();
  const jobId = String(formData.get('job_id') ?? '').trim();
  if (!jobId) throw new Error('Missing job');

  // Trust the server for the company, not the client.
  const { data: job } = await supabase.from('jobs').select('company_id').eq('id', jobId).single();
  const companyId = job?.company_id ?? null;

  let contactId = String(formData.get('contact_id') ?? '').trim() || null;
  const newName = String(formData.get('new_name') ?? '').trim();

  if (!contactId && newName) {
    if (!companyId) throw new Error('Assign a company to this job before adding a new person.');
    const { data: created, error: cErr } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        company_id: companyId,
        name: newName,
        linkedin_url: String(formData.get('new_linkedin') ?? '').trim() || null,
        role: String(formData.get('new_role') ?? '').trim() || null,
      })
      .select('id')
      .single();
    if (cErr) throw new Error(cErr.message);
    contactId = created.id;
  }

  if (!contactId) throw new Error('Pick a person or add a new one.');

  const status = String(formData.get('status') ?? 'to_ask') as ReferralStatus;
  if (!REFERRAL_STATUSES.includes(status)) throw new Error('Invalid status');

  const { error } = await supabase.from('referrals').insert({
    user_id: userId,
    contact_id: contactId,
    job_id: jobId,
    status,
    asked_at: String(formData.get('asked_at') ?? '').trim() || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/referrals');
  revalidatePath('/contacts');
  revalidatePath('/');
  redirect(`/jobs/${jobId}?toast=${encodeURIComponent('Referral added')}`);
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
  const jobId = String(formData.get('job_id') ?? '').trim();
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/referrals');
  revalidatePath('/jobs');
  revalidatePath('/');
}
