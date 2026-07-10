import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Job } from '@/lib/types';

export const dynamic = 'force-dynamic';

type EventKind = 'deadline' | 'applied' | 'followup' | 'interview';
type CalEvent = { kind: EventKind; label: string; href: string };

const KIND_LABEL: Record<EventKind, string> = {
  deadline: 'Apply by',
  applied: 'Applied',
  followup: 'Follow up',
  interview: 'Interview',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const now = new Date();

  // Parse ?m=YYYY-MM, fall back to the current month.
  const match = /^(\d{4})-(\d{2})$/.exec(sp.m ?? '');
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth(); // 0-based

  const supabase = await createClient();
  const [{ data: jobsData }, { data: interviewsData }] = await Promise.all([
    supabase.from('jobs').select('id, role, deadline, applied_at, follow_up_at'),
    supabase.from('interviews').select('id, job_id, scheduled_at'),
  ]);
  const jobs = (jobsData ?? []) as Pick<Job, 'id' | 'role' | 'deadline' | 'applied_at' | 'follow_up_at'>[];
  const roleOf = new Map(jobs.map((j) => [j.id, j.role]));

  // Bucket every dated item by day.
  const byDay = new Map<string, CalEvent[]>();
  const push = (day: string | null, ev: CalEvent) => {
    if (!day) return;
    const key = day.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(ev);
    byDay.set(key, list);
  };
  for (const j of jobs) {
    push(j.deadline, { kind: 'deadline', label: j.role, href: `/jobs/${j.id}` });
    push(j.applied_at, { kind: 'applied', label: j.role, href: `/jobs/${j.id}` });
    push(j.follow_up_at, { kind: 'followup', label: j.role, href: `/jobs/${j.id}` });
  }
  for (const iv of (interviewsData ?? []) as { id: string; job_id: string; scheduled_at: string | null }[]) {
    push(iv.scheduled_at, {
      kind: 'interview',
      label: roleOf.get(iv.job_id) ?? 'Interview',
      href: `/jobs/${iv.job_id}`,
    });
  }

  // Build the month grid (weeks of 7, Sunday-first).
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 0..6
  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const next = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };
  const pp = `${prev.y}-${String(prev.m).padStart(2, '0')}`;
  const np = `${next.y}-${String(next.m).padStart(2, '0')}`;
  const todayKey = ymd(now);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="subtitle" style={{ margin: 0 }}>Deadlines, applications, follow-ups, and interviews.</p>
        </div>
        <div className="cal-nav">
          <Link className="btn secondary sm" href={`/calendar?m=${pp}`} aria-label="Previous month">←</Link>
          <span className="cal-title">{MONTHS[month]} {year}</span>
          <Link className="btn secondary sm" href={`/calendar?m=${np}`} aria-label="Next month">→</Link>
          <Link className="btn secondary sm" href="/calendar">Today</Link>
        </div>
      </div>

      <div className="cal-legend">
        {(Object.keys(KIND_LABEL) as EventKind[]).map((k) => (
          <span key={k} className="cal-legend-item">
            <span className={`cal-dot ${k}`} aria-hidden="true" />
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>

      <div className="cal-grid mt">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="cal-cell empty" aria-hidden="true" />;
          const key = ymd(new Date(year, month, d));
          const events = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={i} className={`cal-cell${isToday ? ' today' : ''}`}>
              <div className="cal-daynum">{d}</div>
              <div className="cal-events">
                {events.slice(0, 4).map((ev, j) => (
                  <Link key={j} href={ev.href} className={`cal-event ${ev.kind}`} title={`${KIND_LABEL[ev.kind]}: ${ev.label}`}>
                    <span className="cal-dot" aria-hidden="true" />
                    <span className="cal-event-label">{ev.label}</span>
                  </Link>
                ))}
                {events.length > 4 && <span className="cal-more">+{events.length - 4} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
