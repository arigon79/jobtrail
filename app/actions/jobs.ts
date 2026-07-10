'use server';

import { revalidatePath } from 'next/cache';
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

export async function createJob(formData: FormData) {
  const { supabase, userId } = await uid();
  const role = String(formData.get('role') ?? '').trim();
  if (!role) throw new Error('Role is required');

  const status = String(formData.get('status') ?? 'to_apply') as JobStatus;
  const priority = String(formData.get('priority') ?? 'med') as Priority;
  if (!JOB_STATUSES.includes(status)) throw new Error('Invalid status');
  if (!PRIORITIES.includes(priority)) throw new Error('Invalid priority');

  const { error } = await supabase.from('jobs').insert({
    user_id: userId,
    role,
    company_id: str(formData, 'company_id'),
    job_link: str(formData, 'job_link'),
    location: str(formData, 'location'),
    remote: formData.get('remote') === 'on',
    salary_range: str(formData, 'salary_range'),
    status,
    priority,
    deadline: str(formData, 'deadline'),
    applied_at: str(formData, 'applied_at'),
    follow_up_at: str(formData, 'follow_up_at'),
    notes: str(formData, 'notes'),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/');
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

export async function deleteJob(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
  revalidatePath('/');
}
