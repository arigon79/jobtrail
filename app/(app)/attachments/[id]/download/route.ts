import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Issues a short-lived signed URL for a job attachment and redirects to it.
// Default opens the file inline (so PDFs render in the browser); `?download=1`
// forces a save. RLS ensures only the owner can read the row / object.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forceDownload = new URL(request.url).searchParams.get('download') === '1';
  const supabase = await createClient();

  const { data: row } = await supabase.from('attachments').select('storage_path, label').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(row.storage_path, 60, forceDownload ? { download: row.label || true } : undefined);
  if (error || !data) return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
