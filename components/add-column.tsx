'use client';

import { useState } from 'react';
import { createJobColumn } from '@/app/actions/job-columns';
import { JOB_COLUMN_TYPES, JOB_COLUMN_TYPE_LABELS, type JobColumnType } from '@/lib/types';

/**
 * "+ Add column" dropdown for the Tracker. Lets the user define a new custom
 * column (name + type); the choices field appears only for dropdown columns.
 */
export function AddColumn() {
  const [type, setType] = useState<JobColumnType>('text');

  return (
    <details className="add-column">
      <summary className="btn secondary">+ Add column</summary>
      <div className="panel add-column-form">
        <form action={createJobColumn}>
          <label htmlFor="c-label">Column name *</label>
          <input id="c-label" name="label" required placeholder="e.g. Referrer, Tech stack" autoComplete="off" />

          <label htmlFor="c-type">Type</label>
          <select
            id="c-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.currentTarget.value as JobColumnType)}
          >
            {JOB_COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {JOB_COLUMN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {type === 'select' && (
            <>
              <label htmlFor="c-options">Choices</label>
              <textarea
                id="c-options"
                name="options"
                placeholder="One per line&#10;e.g.&#10;Remote&#10;Hybrid&#10;Onsite"
                rows={4}
              />
            </>
          )}

          <button className="mt" type="submit">Add column</button>
        </form>
      </div>
    </details>
  );
}
