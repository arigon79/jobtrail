import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Issues a short-lived signed URL for a resume and redirects to it.
// RLS ensures only the owner can read the row / object.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase.from('resumes').select('storage_path').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(row.storage_path, 60);
  if (error || !data) return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
