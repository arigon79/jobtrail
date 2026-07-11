'use client';

import { useTransition } from 'react';
import { createNote } from '@/app/actions/notes';
import type { KanbanStatus } from '@/lib/types';

export function AddCard({ status }: { status: KanbanStatus }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="kanban-add"
      disabled={pending}
      onClick={() => startTransition(() => createNote(status))}
    >
      + Add card
    </button>
  );
}
