'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JOB_STATUSES, PRIORITIES, type JobStatus, type Priority } from '@/lib/types';

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

/**
 * Resolve the company for a job. Prefers an explicit company_id; otherwise
 * takes a typed company name and finds a matching company (case-insensitive)
 * or creates a new one on the fly. Returns null when neither is given.
 */
async function resolveCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fd: FormData,
): Promise<string | null> {
  const explicitId = str(fd, 'company_id');
  if (explicitId) return explicitId;

  const name = String(fd.get('company') ?? '').trim();
  if (!name) return null;

  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('companies')
    .insert({ user_id: userId, name })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

export async function createJob(formData: FormData) {
  const { supabase, userId } = await uid();
  const role = String(formData.get('role') ?? '').trim();
  if (!role) throw new Error('Role is required');

  const status = String(formData.get('status') ?? 'to_apply') as JobStatus;
  const priority = String(formData.get('priority') ?? 'med') as Priority;
  if (!JOB_STATUSES.includes(status)) throw new Error('Invalid status');
  if (!PRIORITIES.includes(priority)) throw new Error('Invalid priority');

  const companyId = await resolveCompanyId(supabase, userId, formData);

  const { error } = await supabase.from('jobs').insert({
    user_id: userId,
    role,
    company_id: companyId,
    job_link: str(formData, 'job_link'),
    location: str(formData, 'location'),
    remote: formData.get('remote') === 'on',
    salary_range: str(formData, 'salary_range'),
    status,
    priority,
    posted_at: str(formData, 'posted_at'),
    deadline: str(formData, 'deadline'),
    applied_at: str(formData, 'applied_at'),
    follow_up_at: str(formData, 'follow_up_at'),
    notes: str(formData, 'notes'),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/companies');
  revalidatePath('/');
  redirect(`/jobs?toast=${encodeURIComponent(`Added “${role}”`)}`);
}

export async function updateJob(formData: FormData) {
  const { supabase, userId } = await uid();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing job id');

  const role = String(formData.get('role') ?? '').trim();
  if (!role) throw new Error('Role is required');

  const status = String(formData.get('status') ?? 'to_apply') as JobStatus;
  const priority = String(formData.get('priority') ?? 'med') as Priority;
  if (!JOB_STATUSES.includes(status)) throw new Error('Invalid status');
  if (!PRIORITIES.includes(priority)) throw new Error('Invalid priority');

  const companyId = await resolveCompanyId(supabase, userId, formData);

  const offerRaw = String(formData.get('offer_amount') ?? '').trim();
  const offerAmount = offerRaw && !Number.isNaN(Number(offerRaw)) ? Number(offerRaw) : null;

  const { error } = await supabase
    .from('jobs')
    .update({
      role,
      company_id: companyId,
      job_link: str(formData, 'job_link'),
      location: str(formData, 'location'),
      remote: formData.get('remote') === 'on',
      salary_range: str(formData, 'salary_range'),
      status,
      priority,
      posted_at: str(formData, 'posted_at'),
      deadline: str(formData, 'deadline'),
      applied_at: str(formData, 'applied_at'),
      follow_up_at: str(formData, 'follow_up_at'),
      offer_amount: offerAmount,
      offer_currency: str(formData, 'offer_currency') ?? 'USD',
      notes: str(formData, 'notes'),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/jobs');
  revalidatePath(`/jobs/${id}`);
  revalidatePath('/companies');
  revalidatePath('/');
  redirect(`/jobs/${id}?toast=${encodeURIComponent('Changes saved')}`);
}

export async function updateJobStatus(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const status = String(formData.get('status')) as JobStatus;
  if (!JOB_STATUSES.includes(status)) throw new Error('Invalid status');

  const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export async function updateJobPriority(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const priority = String(formData.get('priority')) as Priority;
  if (!PRIORITIES.includes(priority)) throw new Error('Invalid priority');

  const { error } = await supabase.from('jobs').update({ priority }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export async function deleteJob(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export async function toggleJobPin(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const pinned = formData.get('pinned') === 'true';
  const { error } = await supabase.from('jobs').update({ pinned: !pinned }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/');
}
