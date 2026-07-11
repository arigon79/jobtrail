import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/badges';
import { JOB_STATUS_LABELS, type Job, type JobStatus, type Note } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Format a 'YYYY-MM-DD' (or ISO timestamp) as "Jul 12" without timezone drift.
function fmtDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MON[m - 1]} ${d}`;
}

type UpKind = 'deadline' | 'followup' | 'interview';
type UpItem = { date: string; kind: UpKind; label: string; href: string };
const UP_LABEL: Record<UpKind, string> = { deadline: 'Apply by', followup: 'Follow up', interview: 'Interview' };

export default async function Dashboard() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = daysFromNow(7);

  const [{ data: userData }, { data: jobs }, { data: interviews }, referralsRes, { data: notesData }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.from('jobs').select('*'),
      supabase.from('interviews').select('id, job_id, scheduled_at').gte('scheduled_at', today),
      supabase.from('referrals').select('id').in('status', ['to_ask', 'asked']),
      supabase.from('notes').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(5),
    ]);

  const allJobs = (jobs ?? []) as Job[];
  const notes = (notesData ?? []) as Note[];
  const roleOf = new Map(allJobs.map((j) => [j.id, j.role]));

  const fullName = (userData.user?.user_metadata?.full_name as string | undefined) ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';

  const counts: Record<string, number> = {};
  for (const j of allJobs) counts[j.status] = (counts[j.status] ?? 0) + 1;

  const activeStatuses: JobStatus[] = [
    'to_apply', 'applied', 'oa', 'phone_screen', 'interview', 'final', 'offer',
  ];

  const deadlineSoon = allJobs.filter(
    (j) => j.deadline && j.deadline >= today && j.deadline <= in7 && j.status === 'to_apply',
  );
  const followUpDue = allJobs.filter((j) => j.follow_up_at && j.follow_up_at <= today);
  const interviewsSoon = ((interviews ?? []) as { scheduled_at: string | null }[]).filter(
    (i) => i.scheduled_at && i.scheduled_at.slice(0, 10) <= in7,
  ).length;

  // Upcoming agenda for the side rail: the next few dated things from today on.
  const ups: UpItem[] = [];
  for (const j of allJobs) {
    if (j.deadline && j.deadline >= today) ups.push({ date: j.deadline, kind: 'deadline', label: j.role, href: `/jobs/${j.id}` });
    if (j.follow_up_at && j.follow_up_at >= today) ups.push({ date: j.follow_up_at, kind: 'followup', label: j.role, href: `/jobs/${j.id}` });
  }
  for (const iv of (interviews ?? []) as { job_id: string; scheduled_at: string | null }[]) {
    if (iv.scheduled_at) ups.push({ date: iv.scheduled_at.slice(0, 10), kind: 'interview', label: roleOf.get(iv.job_id) ?? 'Interview', href: `/jobs/${iv.job_id}` });
  }
  ups.sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = ups.slice(0, 6);

  const stats = [
    { n: allJobs.length, l: 'Total jobs', color: 'var(--text)' },
    { n: deadlineSoon.length, l: 'Deadlines < 7d', color: 'var(--amber)' },
    { n: followUpDue.length, l: 'Follow-ups due', color: 'var(--red)' },
    { n: interviewsSoon, l: 'Interviews < 7d', color: 'var(--accent)' },
    { n: referralsRes.data?.length ?? 0, l: 'Open referrals', color: 'var(--green)' },
  ];

  return (
    <div>
      <h1>{firstName ? `Hi, ${firstName}` : 'Dashboard'}</h1>
      <p className="subtitle">Where every application stands, at a glance.</p>

      <div className="cards">
        {stats.map((s) => (
          <div className="card" key={s.l}>
            <div className="n" style={{ color: s.color }}>{s.n}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid mt">
        {/* Main column */}
        <div>
          <h2>By status</h2>
          <div className="cards">
            {activeStatuses.map((s) => (
              <Link key={s} href={`/jobs?status=${s}`} className="card">
                <div className="n">{counts[s] ?? 0}</div>
                <div className="l">{JOB_STATUS_LABELS[s]}</div>
              </Link>
            ))}
          </div>

          {deadlineSoon.length > 0 && (
            <>
              <h2>Apply soon</h2>
              <div className="panel" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <tbody>
                      {deadlineSoon.map((j) => (
                        <tr key={j.id}>
                          <td style={{ fontWeight: 600 }}><Link href={`/jobs/${j.id}`}>{j.role}</Link></td>
                          <td><StatusBadge status={j.status} /></td>
                          <td className="right muted">due {fmtDay(j.deadline!)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {followUpDue.length > 0 && (
            <>
              <h2>Chase up</h2>
              <div className="panel" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <tbody>
                      {followUpDue.map((j) => (
                        <tr key={j.id}>
                          <td style={{ fontWeight: 600 }}><Link href={`/jobs/${j.id}`}>{j.role}</Link></td>
                          <td><StatusBadge status={j.status} /></td>
                          <td className="right muted">follow up {fmtDay(j.follow_up_at!)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {allJobs.length === 0 && (
            <div className="empty mt">
              <div className="icon" aria-hidden="true">🚀</div>
              <h3>No jobs yet</h3>
              <p>Add your first application to start tracking.</p>
              <Link className="btn" href="/jobs">Add a job</Link>
            </div>
          )}
        </div>

        {/* Side rail: Calendar + Notes */}
        <aside className="dash-side">
          <section className="side-card">
            <div className="side-head">
              <h3>Upcoming</h3>
              <Link href="/calendar">Calendar →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="side-empty">Nothing scheduled. Add deadlines or interviews.</p>
            ) : (
              <ul className="agenda">
                {upcoming.map((u, i) => (
                  <li key={i}>
                    <Link href={u.href} className="agenda-item">
                      <span className={`cal-dot ${u.kind}`} aria-hidden="true" />
                      <span className="agenda-label">{u.label}</span>
                      <span className="agenda-when">{fmtDay(u.date)}</span>
                    </Link>
                    <span className="agenda-kind">{UP_LABEL[u.kind]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="side-card">
            <div className="side-head">
              <h3>Kanban</h3>
              <Link href="/notes">Board →</Link>
            </div>
            {notes.length === 0 ? (
              <p className="side-empty">No notes yet. Pin down a reminder.</p>
            ) : (
              <ul className="side-notes">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link href="/notes" className="side-note" data-color={n.color}>
                      {n.body.trim() || 'Empty note'}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
