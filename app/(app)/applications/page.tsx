import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, PriorityBadge } from '@/components/badges';
import type { Company, Job } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const [{ data: jobsData }, { data: companiesData }] = await Promise.all([
    supabase.from('jobs').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name'),
  ]);

  const jobs = (jobsData ?? []) as Job[];
  const coName = new Map(((companiesData ?? []) as Pick<Company, 'id' | 'name'>[]).map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Jobs</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {jobs.length} {jobs.length === 1 ? 'application' : 'applications'} — open one to manage files and details.
          </p>
        </div>
        <Link className="btn" href="/jobs">Open Tracker</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="empty mt">
          <div className="icon" aria-hidden="true">🗂️</div>
          <h3>No applications yet</h3>
          <p>Add jobs in the Tracker to see them here.</p>
          <Link className="btn" href="/jobs">Go to Tracker</Link>
        </div>
      ) : (
        <div className="job-cards mt">
          {jobs.map((j) => (
            <article key={j.id} className={`job-card${j.pinned ? ' pinned' : ''}`}>
              <div className="job-card-head">
                <h3><Link href={`/jobs/${j.id}`}>{j.role}</Link></h3>
                <span className="muted">{j.company_id ? coName.get(j.company_id) ?? '—' : '—'}</span>
              </div>

              <div className="job-card-badges">
                <StatusBadge status={j.status} />
                <PriorityBadge priority={j.priority} />
              </div>

              <dl className="job-card-meta">
                <div><dt>Location</dt><dd>{j.location ?? '—'}{j.remote ? ' · Remote' : ''}</dd></div>
                <div><dt>Deadline</dt><dd>{j.deadline ?? '—'}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
