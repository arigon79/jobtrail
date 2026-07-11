'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { KANBAN_COLUMNS, NOTE_COLORS, type KanbanStatus, type NoteColor } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return { supabase, userId: data.user.id };
}

export async function createNote(status: KanbanStatus = 'todo') {
  if (!KANBAN_COLUMNS.includes(status)) throw new Error('Invalid column');
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('notes').insert({ user_id: userId, body: '', status });
  if (error) throw new Error(error.message);
  revalidatePath('/notes');
}

export async function moveNote(id: string, status: KanbanStatus) {
  if (!KANBAN_COLUMNS.includes(status)) throw new Error('Invalid column');
  const { supabase } = await uid();
  const { error } = await supabase.from('notes').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/notes');
}

export async function updateNoteBody(id: string, body: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from('notes').update({ body }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/notes');
}

export async function setNoteColor(id: string, color: NoteColor) {
  if (!NOTE_COLORS.includes(color)) throw new Error('Invalid color');
  const { supabase } = await uid();
  const { error } = await supabase.from('notes').update({ color }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/notes');
}

export async function toggleNotePin(id: string, pinned: boolean) {
  const { supabase } = await uid();
  const { error } = await supabase.from('notes').update({ pinned: !pinned }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/notes');
}

export async function deleteNote(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/notes');
}
