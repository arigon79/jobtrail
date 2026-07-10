import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addInterview, deleteInterview } from '@/app/actions/interviews';
import { StatusBadge, PriorityBadge, OutcomeBadge } from '@/components/badges';
import {
  INTERVIEW_KINDS, INTERVIEW_OUTCOMES,
  type Company, type Interview, type Job,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (!job) notFound();
  const j = job as Job;

  const [{ data: company }, { data: interviews }] = await Promise.all([
    j.company_id
      ? supabase.from('companies').select('*').eq('id', j.company_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('interviews').select('*').eq('job_id', id).order('scheduled_at'),
  ]);

  const co = company as Company | null;
  const rounds = (interviews ?? []) as Interview[];

  return (
    <div>
      <p><Link href="/jobs">← Jobs</Link></p>
      <h1>{j.role}</h1>
      <p className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>{co ? co.name : 'No company'}</span>
        <StatusBadge status={j.status} />
        <PriorityBadge priority={j.priority} />
      </p>

      <div className="panel">
        <div className="grid-2">
          <div><span className="muted">Location</span><br />{j.location ?? '—'}{j.remote ? ' (remote)' : ''}</div>
          <div><span className="muted">Salary range</span><br />{j.salary_range ?? '—'}</div>
          <div><span className="muted">Deadline</span><br />{j.deadline ?? '—'}</div>
          <div><span className="muted">Applied</span><br />{j.applied_at ?? '—'}</div>
          <div><span className="muted">Follow-up</span><br />{j.follow_up_at ?? '—'}</div>
          <div>
            <span className="muted">Offer</span><br />
            {j.offer_amount != null ? `${j.offer_amount} ${j.offer_currency ?? ''}` : '—'}
          </div>
        </div>
        {j.job_link && <p className="mt"><a href={j.job_link} target="_blank" rel="noreferrer">Job posting ↗</a></p>}
        {j.notes && <p className="mt muted" style={{ whiteSpace: 'pre-wrap' }}>{j.notes}</p>}
      </div>

      <h2>Interview rounds</h2>
      <div className="panel">
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Round</th><th>Kind</th><th>When</th><th>Outcome</th><th></th></tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id}>
                <td>{r.round ?? '—'}</td>
                <td className="muted">{r.kind ?? '—'}</td>
                <td className="muted">{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : '—'}</td>
                <td><OutcomeBadge outcome={r.outcome} /></td>
                <td className="right">
                  <form action={deleteInterview}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="job_id" value={j.id} />
                    <button className="secondary sm danger" type="submit" aria-label="Delete interview round">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rounds.length === 0 && <tr><td colSpan={5} className="muted">No rounds yet.</td></tr>}
          </tbody>
        </table>
        </div>

        <form action={addInterview} className="mt">
          <input type="hidden" name="job_id" value={j.id} />
          <div className="grid-2">
            <div>
              <label>Round</label>
              <input name="round" placeholder="Round 1 / Onsite" />
            </div>
            <div>
              <label>Kind</label>
              <select name="kind" defaultValue="">
                <option value="">—</option>
                {INTERVIEW_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label>Scheduled at</label>
              <input name="scheduled_at" type="datetime-local" />
            </div>
            <div>
              <label>Outcome</label>
              <select name="outcome" defaultValue="pending">
                {INTERVIEW_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <label>Notes</label>
          <textarea name="notes" />
          <button className="mt" type="submit">Add round</button>
        </form>
      </div>
    </div>
  );
}
