'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JOB_COLUMN_TYPES, type JobColumnType } from '@/lib/types';

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

// Split a textarea of dropdown choices (one per line or comma-separated),
// trimming blanks and de-duplicating while preserving order.
function parseOptions(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]/)) {
    const v = part.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export async function createJobColumn(formData: FormData) {
  const { supabase, userId } = await uid();

  const label = String(formData.get('label') ?? '').trim();
  if (!label) throw new Error('Column name is required');

  const type = String(formData.get('type') ?? 'text') as JobColumnType;
  if (!JOB_COLUMN_TYPES.includes(type)) throw new Error('Invalid column type');

  const options = type === 'select' ? parseOptions(str(formData, 'options')) : [];
  if (type === 'select' && options.length === 0) {
    throw new Error('A dropdown column needs at least one choice');
  }

  // Append after the current last column.
  const { data: last } = await supabase
    .from('job_columns')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase
    .from('job_columns')
    .insert({ user_id: userId, label, type, options, position });
  if (error) throw new Error(error.message);

  revalidatePath('/jobs');
  redirect(`/jobs?toast=${encodeURIComponent(`Added column “${label}”`)}`);
}

export async function deleteJobColumn(formData: FormData) {
  const { supabase } = await uid();
  const id = String(formData.get('id'));
  // Definition goes; any orphaned values in jobs.custom are simply ignored.
  const { error } = await supabase.from('job_columns').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
}

// Set (or clear) one job's value for one custom column. Merges into the job's
// existing `custom` map; an empty value drops the key so the map stays tidy.
export async function setJobCustomValue(formData: FormData) {
  const { supabase } = await uid();
  const jobId = String(formData.get('job_id'));
  const columnId = String(formData.get('column_id'));
  if (!jobId || !columnId) throw new Error('Missing job or column id');

  const value = String(formData.get('value') ?? '').trim();

  const { data: job, error: readErr } = await supabase
    .from('jobs')
    .select('custom')
    .eq('id', jobId)
    .single();
  if (readErr) throw new Error(readErr.message);

  const custom: Record<string, string> = { ...(job?.custom ?? {}) };
  if (value) custom[columnId] = value;
  else delete custom[columnId];

  const { error } = await supabase.from('jobs').update({ custom }).eq('id', jobId);
  if (error) throw new Error(error.message);
  revalidatePath('/jobs');
}
