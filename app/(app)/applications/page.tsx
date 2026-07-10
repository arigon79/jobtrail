import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { uploadJobResume, removeJobResume } from '@/app/actions/resumes';
import { StatusBadge, PriorityBadge } from '@/components/badges';
import type { Company, Job, Resume } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const [{ data: jobsData }, { data: companiesData }, { data: resumesData }] = await Promise.all([
    supabase.from('jobs').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name'),
    supabase.from('resumes').select('id, label'),
  ]);

  const jobs = (jobsData ?? []) as Job[];
  const coName = new Map(((companiesData ?? []) as Pick<Company, 'id' | 'name'>[]).map((c) => [c.id, c.name]));
  const resumeById = new Map(((resumesData ?? []) as Pick<Resume, 'id' | 'label'>[]).map((r) => [r.id, r]));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Jobs</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {jobs.length} {jobs.length === 1 ? 'application' : 'applications'} — attach a tailored resume to each.
          </p>
        </div>
        <Link className="btn" href="/jobs">Open Tracker</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="empty mt">
          <div className="icon" aria-hidden="true">🗂️</div>
          <h3>No applications yet</h3>
          <p>Add jobs in the Tracker, then attach resumes here.</p>
          <Link className="btn" href="/jobs">Go to Tracker</Link>
        </div>
      ) : (
        <div className="job-cards mt">
          {jobs.map((j) => {
            const resume = j.resume_id ? resumeById.get(j.resume_id) : undefined;
            return (
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

                <div className="job-card-resume">
                  {resume ? (
                    <div className="resume-attached">
                      <span className="resume-name" title={resume.label}>
                        <span aria-hidden="true">📄</span> {resume.label}
                      </span>
                      <div className="inline-actions">
                        <a className="btn secondary sm" href={`/resumes/${resume.id}/download`} target="_blank" rel="noreferrer">Download</a>
                        <form action={removeJobResume}>
                          <input type="hidden" name="job_id" value={j.id} />
                          <button className="secondary sm danger" type="submit" aria-label={`Remove resume from ${j.role}`}>Remove</button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <form action={uploadJobResume} className="resume-upload">
                      <input type="hidden" name="job_id" value={j.id} />
                      <input type="file" name="file" accept="application/pdf" required aria-label={`Resume PDF for ${j.role}`} />
                      <button type="submit" className="sm">Attach resume</button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
