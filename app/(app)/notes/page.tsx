import { createClient } from '@/lib/supabase/server';
import { StickyNote } from '@/components/sticky-note';
import { createNote } from '@/app/actions/notes';
import type { Note } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  const notes = (data ?? []) as Note[];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notes</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {notes.length === 0 ? 'A corkboard for anything worth remembering.' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}.`}
          </p>
        </div>
        <form action={createNote}>
          <button type="submit">+ New note</button>
        </form>
      </div>

      {notes.length === 0 ? (
        <div className="empty mt">
          <div className="icon" aria-hidden="true">📌</div>
          <h3>No notes yet</h3>
          <p>Pin down reminders, interview prep, or anything else.</p>
          <form action={createNote}>
            <button type="submit">Add your first note</button>
          </form>
        </div>
      ) : (
        <div className="board mt">
          {notes.map((n) => (
            <StickyNote key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
