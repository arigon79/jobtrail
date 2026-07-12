'use client';

import { useEffect, useState } from 'react';

/**
 * Lets the user show/hide Tracker columns. The table is server-rendered with a
 * stable `data-col` on every matching th/td; this control persists the hidden
 * set to localStorage (per-device, single user — no DB needed) and injects a
 * <style> that hides `[data-col]` cells for anything unchecked.
 */

export const TRACKER_COLUMNS = [
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'location', label: 'Location' },
  { key: 'remote', label: 'Remote' },
  { key: 'salary', label: 'Salary' },
  { key: 'posted', label: 'Posted' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'applied', label: 'Applied' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'referral', label: 'Referral' },
] as const;

const STORAGE_KEY = 'jobs-hidden-cols';
const VALID = new Set(TRACKER_COLUMNS.map((c) => c.key));

function readHidden(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as string[]).filter((k) => VALID.has(k as never));
  } catch {
    return [];
  }
}

export function ColumnCustomizer() {
  // Start empty so SSR and first client render agree (avoids a hydration
  // mismatch); the effect then loads the saved set.
  const [hidden, setHidden] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHidden(readHidden());
    setLoaded(true);
  }, []);

  function toggle(key: string) {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked — keep the in-memory state anyway */
      }
      return next;
    });
  }

  const hiddenSet = new Set(hidden);
  const shown = TRACKER_COLUMNS.length - hidden.length;

  return (
    <details className="col-customizer">
      <summary className="btn secondary">
        Columns{loaded && hidden.length > 0 ? ` (${shown}/${TRACKER_COLUMNS.length})` : ''}
      </summary>
      <div className="panel col-customizer-menu">
        <p className="col-customizer-head">Show columns</p>
        {TRACKER_COLUMNS.map((c) => (
          <label key={c.key} className="col-customizer-row">
            <input
              type="checkbox"
              checked={!hiddenSet.has(c.key)}
              onChange={() => toggle(c.key)}
            />
            {c.label}
          </label>
        ))}
        {hidden.length > 0 && (
          <button
            type="button"
            className="btn secondary col-customizer-reset"
            onClick={() => {
              setHidden([]);
              try {
                window.localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* ignore */
              }
            }}
          >
            Show all
          </button>
        )}
      </div>
      {/* Only emit hiding rules once loaded, so a full column set paints first. */}
      {loaded && hidden.length > 0 && (
        <style>{hidden.map((k) => `.sheet [data-col="${k}"]`).join(',') + '{display:none}'}</style>
      )}
    </details>
  );
}
