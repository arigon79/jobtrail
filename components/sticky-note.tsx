'use client';

import { useRef, useState, useTransition } from 'react';
import { NOTE_COLORS, type Note, type NoteColor } from '@/lib/types';
import { updateNoteBody, setNoteColor, toggleNotePin, deleteNote } from '@/app/actions/notes';

// Deterministic tiny tilt per note so the board feels hand-pinned, not gridded.
function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return ((h % 5) - 2) * 0.9; // -1.8deg .. 1.8deg
}

export function StickyNote({ note }: { note: Note }) {
  const [body, setBody] = useState(note.body);
  const [pending, startTransition] = useTransition();
  const lastSaved = useRef(note.body);

  function save() {
    if (body === lastSaved.current) return;
    lastSaved.current = body;
    startTransition(() => updateNoteBody(note.id, body));
  }

  return (
    <div
      className="note"
      data-color={note.color}
      style={{ '--tilt': `${tilt(note.id)}deg` } as React.CSSProperties}
    >
      <span className="note-pinhead" aria-hidden="true" />

      <div className="note-actions">
        <button
          type="button"
          className={`note-pin${note.pinned ? ' on' : ''}`}
          onClick={() => startTransition(() => toggleNotePin(note.id, note.pinned))}
          aria-pressed={note.pinned}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          title={note.pinned ? 'Unpin' : 'Pin to top'}
        >
          <svg viewBox="0 0 24 24" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
          </svg>
        </button>
        <button
          type="button"
          className="note-del"
          onClick={() => {
            if (confirm('Delete this note?')) startTransition(() => deleteNote(note.id));
          }}
          aria-label="Delete note"
          title="Delete"
        >
          ✕
        </button>
      </div>

      <textarea
        className="note-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={save}
        placeholder="Write a note…"
        aria-label="Note text"
        rows={5}
      />

      <div className="note-foot">
        <div className="note-colors" role="group" aria-label="Note color">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${note.color === c ? ' on' : ''}`}
              data-color={c}
              onClick={() => startTransition(() => setNoteColor(note.id, c as NoteColor))}
              aria-label={`Color ${c}`}
              aria-pressed={note.color === c}
            />
          ))}
        </div>
        <span className="note-saved" aria-hidden="true">{pending ? 'Saving…' : ''}</span>
      </div>
    </div>
  );
}
