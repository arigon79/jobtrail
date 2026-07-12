'use client';

import { useRef } from 'react';
import { setJobCustomValue } from '@/app/actions/job-columns';
import type { JobColumn } from '@/lib/types';

/**
 * Inline editor for one job's value in a user-defined column. Mirrors the
 * spreadsheet feel of AutoSubmitSelect: dropdowns save on change, free inputs
 * save on blur or Enter — but only when the value actually changed, so tabbing
 * through cells doesn't fire needless writes.
 */
export function CustomCell({
  jobId,
  column,
  value,
}: {
  jobId: string;
  column: JobColumn;
  value: string;
}) {
  const initial = useRef(value);

  function submitIfChanged(el: HTMLInputElement | HTMLSelectElement) {
    if (el.value === initial.current) return;
    initial.current = el.value;
    el.form?.requestSubmit();
  }

  const inputType =
    column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text';

  return (
    <form action={setJobCustomValue}>
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="column_id" value={column.id} />
      {column.type === 'select' ? (
        <select
          name="value"
          defaultValue={value}
          aria-label={column.label}
          onChange={(e) => submitIfChanged(e.currentTarget)}
        >
          <option value="">—</option>
          {column.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={inputType}
          name="value"
          defaultValue={value}
          aria-label={column.label}
          onBlur={(e) => submitIfChanged(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitIfChanged(e.currentTarget);
            }
          }}
        />
      )}
    </form>
  );
}
