import { createClient } from '@/lib/supabase/server';
import { StickyNote } from '@/components/sticky-note';
import { AddCard } from '@/components/add-card';
import { KANBAN_COLUMNS, KANBAN_COLUMN_LABELS, type Note } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function KanbanPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  const notes = (data ?? []) as Note[];

  const byStatus = (s: string) => notes.filter((n) => n.status === s);

  return (
    <div className="page-wide">
      <div className="page-head">
        <div>
          <h1>Kanban</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {notes.length === 0
              ? 'Track anything worth remembering across three columns.'
              : `${notes.length} ${notes.length === 1 ? 'card' : 'cards'} across the board.`}
          </p>
        </div>
      </div>

      <div className="kanban mt">
        {KANBAN_COLUMNS.map((col) => {
          const cards = byStatus(col);
          return (
            <section key={col} className="kanban-col" aria-label={KANBAN_COLUMN_LABELS[col]}>
              <div className="kanban-col-head">
                <span>{KANBAN_COLUMN_LABELS[col]}</span>
                <span className="count">{cards.length}</span>
              </div>
              <div className="kanban-cards">
                {cards.map((n) => (
                  <StickyNote key={n.id} note={n} />
                ))}
              </div>
              <AddCard status={col} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
