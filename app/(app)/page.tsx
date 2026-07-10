import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/badges';
import { JOB_STATUS_LABELS, type Job, type JobStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function Dashboard() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = daysFromNow(7);

  const [{ data: jobs }, interviewsRes, referralsRes] = await Promise.all([
    supabase.from('jobs').select('*'),
    supabase
      .from('interviews')
      .select('id')
      .gte('scheduled_at', today)
      .lte('scheduled_at', in7 + 'T23:59:59'),
    supabase.from('referrals').select('id').in('status', ['to_ask', 'asked']),
  ]);

  const allJobs = (jobs ?? []) as Job[];

  const counts: Record<string, number> = {};
  for (const j of allJobs) counts[j.status] = (counts[j.status] ?? 0) + 1;

  const activeStatuses: JobStatus[] = [
    'to_apply', 'applied', 'oa', 'phone_screen', 'interview', 'final', 'offer',
  ];

  const deadlineSoon = allJobs.filter(
    (j) => j.deadline && j.deadline >= today && j.deadline <= in7 && j.status === 'to_apply',
  );
  const followUpDue = allJobs.filter((j) => j.follow_up_at && j.follow_up_at <= today);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="subtitle">Where every application stands, at a glance.</p>

      <div className="cards">
        <div className="card">
          <div className="n">{allJobs.length}</div>
          <div className="l">Total jobs</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--amber)' }}>{deadlineSoon.length}</div>
          <div className="l">Deadlines &lt; 7 days</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--red)' }}>{followUpDue.length}</div>
          <div className="l">Follow-ups due</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--accent)' }}>{interviewsRes.data?.length ?? 0}</div>
          <div className="l">Interviews &lt; 7 days</div>
        </div>
        <div className="card">
          <div className="n" style={{ color: 'var(--green)' }}>{referralsRes.data?.length ?? 0}</div>
          <div className="l">Open referral asks</div>
        </div>
      </div>

      <h2>By status</h2>
      <div className="cards">
        {activeStatuses.map((s) => (
          <Link key={s} href={`/jobs?status=${s}`} className="card" style={{ display: 'block' }}>
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
                      <td className="right muted">due {j.deadline}</td>
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
                      <td className="right muted">follow up {j.follow_up_at}</td>
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
  );
}
