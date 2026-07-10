'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { INTERVIEW_KINDS, INTERVIEW_OUTCOMES } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function addInterview(formData: FormData) {
  const { supabase, userId } = await uid();
  const jobId = String(formData.get('job_id'));
  const kind = String(formData.get('kind') ?? '') || null;
  const outcome = String(formData.get('outcome') ?? '') || null;
  if (kind && !INTERVIEW_KINDS.includes(kind as never)) throw new Error('Invalid kind');
  if (outcome && !INTERVIEW_OUTCOMES.includes(outcome as never)) throw new Error('Invalid outcome');

  const scheduled = String(formData.get('scheduled_at') ?? '').trim();
  const { error } = await supabase.from('interviews').insert({
    user_id: userId,
    job_id: jobId,
    round: String(formData.get('round') ?? '').trim() || null,
    kind,
    scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
    outcome,
    notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/');
}

export async function deleteInterview(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const jobId = String(formData.get('job_id'));
  const { error } = await supabase.from('interviews').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
}
