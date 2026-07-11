'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ATTACHMENT_KINDS, type AttachmentKind } from '@/lib/types';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// PDF + Word (.doc/.docx). Map MIME → file extension for the stored object.
const ALLOWED: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function uploadJobAttachment(formData: FormData) {
  const { supabase, userId } = await uid();

  const jobId = String(formData.get('job_id') ?? '').trim();
  if (!jobId) throw new Error('Missing job');

  // Verify the job belongs to this user before storing anything against it.
  const { data: job } = await supabase.from('jobs').select('id').eq('id', jobId).single();
  if (!job) throw new Error('Job not found');

  const kind = String(formData.get('kind') ?? 'resume') as AttachmentKind;
  if (!ATTACHMENT_KINDS.includes(kind)) throw new Error('Invalid attachment type');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file');
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error('Only PDF and Word (.doc/.docx) files are allowed');
  if (file.size > MAX_BYTES) throw new Error('File must be under 10 MB');

  // Fall back to the original filename (minus extension) when no label is given.
  const label =
    String(formData.get('label') ?? '').trim() ||
    file.name.replace(/\.[^.]+$/, '') ||
    'Attachment';

  const attachmentId = crypto.randomUUID();
  const path = `${userId}/${jobId}/${attachmentId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('attachments')
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error } = await supabase.from('attachments').insert({
    id: attachmentId,
    user_id: userId,
    job_id: jobId,
    kind,
    label,
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from('attachments').remove([path]); // roll back orphan
    throw new Error(error.message);
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJobAttachment(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  const jobId = String(formData.get('job_id') ?? '').trim();

  const { data: row } = await supabase.from('attachments').select('storage_path').eq('id', id).single();
  if (row) await supabase.storage.from('attachments').remove([row.storage_path]);

  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (jobId) revalidatePath(`/jobs/${jobId}`);
}
