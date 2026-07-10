'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function uploadResume(formData: FormData) {
  const { supabase, userId } = await uid();
  const file = formData.get('file');
  const label = String(formData.get('label') ?? '').trim();
  const companyRaw = String(formData.get('company_id') ?? '').trim();
  const companyId = companyRaw || null;

  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a PDF file');
  if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed');
  if (file.size > MAX_BYTES) throw new Error('File must be under 10 MB');
  if (!label) throw new Error('Label is required');

  // One resume per company: remove any existing one for this company (replace).
  if (companyId) {
    const { data: existing } = await supabase
      .from('resumes')
      .select('id, storage_path')
      .eq('company_id', companyId)
      .maybeSingle();
    if (existing) {
      await supabase.storage.from('resumes').remove([existing.storage_path]);
      await supabase.from('resumes').delete().eq('id', existing.id);
    }
  }

  const resumeId = crypto.randomUUID();
  const path = `${userId}/${companyId ?? 'general'}/${resumeId}.pdf`;

  const { error: upErr } = await supabase.storage
    .from('resumes')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error } = await supabase.from('resumes').insert({
    id: resumeId,
    user_id: userId,
    company_id: companyId,
    label,
    storage_path: path,
    is_default: !companyId,
  });
  if (error) {
    await supabase.storage.from('resumes').remove([path]); // roll back orphan
    throw new Error(error.message);
  }
  revalidatePath('/resumes');
}

/**
 * Upload a PDF and attach it to a single job (sets jobs.resume_id). Stored as a
 * company-less resume row so it never collides with the one-per-company rule.
 * Replaces (and cleans up) any previous job-specific resume on that job.
 */
export async function uploadJobResume(formData: FormData) {
  const { supabase, userId } = await uid();
  const jobId = String(formData.get('job_id') ?? '').trim();
  if (!jobId) throw new Error('Missing job');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a PDF file');
  if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed');
  if (file.size > MAX_BYTES) throw new Error('File must be under 10 MB');

  const { data: job } = await supabase.from('jobs').select('id, role, resume_id').eq('id', jobId).single();
  if (!job) throw new Error('Job not found');

  const label = String(formData.get('label') ?? '').trim() || `${job.role} — resume`;

  const resumeId = crypto.randomUUID();
  const path = `${userId}/jobs/${resumeId}.pdf`;

  const { error: upErr } = await supabase.storage
    .from('resumes')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error: insErr } = await supabase.from('resumes').insert({
    id: resumeId, user_id: userId, company_id: null, label, storage_path: path, is_default: false,
  });
  if (insErr) {
    await supabase.storage.from('resumes').remove([path]); // roll back orphan
    throw new Error(insErr.message);
  }

  const { error: updErr } = await supabase.from('jobs').update({ resume_id: resumeId }).eq('id', jobId);
  if (updErr) throw new Error(updErr.message);

  // Clean up the job's previous resume, but only if it was job-specific
  // (company-less, non-default) so we never delete a shared company resume.
  if (job.resume_id) {
    const { data: old } = await supabase
      .from('resumes')
      .select('id, storage_path, company_id, is_default')
      .eq('id', job.resume_id)
      .single();
    if (old && old.company_id === null && old.is_default === false) {
      await supabase.storage.from('resumes').remove([old.storage_path]);
      await supabase.from('resumes').delete().eq('id', old.id);
    }
  }

  revalidatePath('/applications');
  revalidatePath('/resumes');
  revalidatePath(`/jobs/${jobId}`);
}

export async function removeJobResume(formData: FormData) {
  const { supabase } = await uid();
  const jobId = String(formData.get('job_id') ?? '').trim();
  if (!jobId) throw new Error('Missing job');

  const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).single();
  await supabase.from('jobs').update({ resume_id: null }).eq('id', jobId);

  if (job?.resume_id) {
    const { data: r } = await supabase
      .from('resumes')
      .select('id, storage_path, company_id, is_default')
      .eq('id', job.resume_id)
      .single();
    if (r && r.company_id === null && r.is_default === false) {
      await supabase.storage.from('resumes').remove([r.storage_path]);
      await supabase.from('resumes').delete().eq('id', r.id);
    }
  }

  revalidatePath('/applications');
  revalidatePath('/resumes');
  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteResume(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const { data: row } = await supabase.from('resumes').select('storage_path').eq('id', id).single();
  if (row) await supabase.storage.from('resumes').remove([row.storage_path]);
  const { error } = await supabase.from('resumes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resumes');
}
