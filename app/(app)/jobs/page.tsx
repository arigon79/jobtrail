import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createJob, updateJobStatus, deleteJob } from '@/app/actions/jobs';
import { PriorityBadge } from '@/components/badges';
import {
  JOB_STATUSES, JOB_STATUS_LABELS, PRIORITIES,
  type Company, type Job,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type Search = { status?: string; company?: string; priority?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
  if (sp.status) query = query.eq('status', sp.status);
  if (sp.company) query = query.eq('company_id', sp.company);
  if (sp.priority) query = query.eq('priority', sp.priority);

  const [{ data: jobs }, { data: companies }] = await Promise.all([
    query,
    supabase.from('companies').select('*').order('name'),
  ]);

  const cos = (companies ?? []) as Company[];
  const coName = new Map(cos.map((c) => [c.id, c.name]));
  const list = (jobs ?? []) as Job[];
  const filtered = Boolean(sp.status || sp.company || sp.priority);

  return (
    <div>
      <h1>Jobs</h1>
      <p className="subtitle">{list.length} {filtered ? 'match your filters' : 'total'}.</p>

      <form className="row" method="get" aria-label="Filter jobs">
        <div>
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={sp.status ?? ''}>
            <option value="">All statuses</option>
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-company">Company</label>
          <select id="f-company" name="company" defaultValue={sp.company ?? ''}>
            <option value="">All companies</option>
            {cos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-priority">Priority</label>
          <select id="f-priority" name="priority" defaultValue={sp.priority ?? ''}>
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <label>&nbsp;</label>
          <button type="submit">Apply</button>
        </div>
        {filtered && (
          <div style={{ flex: '0 0 auto' }}>
            <label>&nbsp;</label>
            <Link className="btn secondary" href="/jobs">Clear</Link>
          </div>
        )}
      </form>

      {list.length === 0 ? (
        <div className="empty mt">
          <div className="icon" aria-hidden="true">🗂️</div>
          <h3>{filtered ? 'No jobs match' : 'No jobs yet'}</h3>
          <p>{filtered ? 'Try clearing the filters.' : 'Add your first application below.'}</p>
        </div>
      ) : (
        <div className="panel mt" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Role</th><th>Company</th><th>Priority</th>
                  <th>Status</th><th>Deadline</th><th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((j) => (
                  <tr key={j.id}>
                    <td data-label="Role" style={{ fontWeight: 600 }}><Link href={`/jobs/${j.id}`}>{j.role}</Link></td>
                    <td data-label="Company" className="muted">{j.company_id ? coName.get(j.company_id) : '—'}</td>
                    <td data-label="Priority"><PriorityBadge priority={j.priority} /></td>
                    <td data-label="Status">
                      <form action={updateJobStatus} className="inline-actions" style={{ justifyContent: 'flex-start', gap: 6 }}>
                        <input type="hidden" name="id" value={j.id} />
                        <select name="status" defaultValue={j.status} aria-label={`Status for ${j.role}`} style={{ width: 'auto' }}>
                          {JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
                        </select>
                        <button className="secondary sm" type="submit">Save</button>
                      </form>
                    </td>
                    <td data-label="Deadline" className="muted">{j.deadline ?? '—'}</td>
                    <td data-label="Actions" className="right">
                      <form action={deleteJob}>
                        <input type="hidden" name="id" value={j.id} />
                        <button className="secondary sm danger" type="submit" aria-label={`Delete ${j.role}`}>Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2>Add a job</h2>
      <div className="panel">
        <form action={createJob}>
          <div className="grid-2">
            <div>
              <label htmlFor="j-role">Role *</label>
              <input id="j-role" name="role" required placeholder="Software Engineer" />
            </div>
            <div>
              <label htmlFor="j-company">Company</label>
              <select id="j-company" name="company_id" defaultValue="">
                <option value="">— none —</option>
                {cos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label htmlFor="j-status">Status</label>
              <select id="j-status" name="status" defaultValue="to_apply">
                {JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="j-priority">Priority</label>
              <select id="j-priority" name="priority" defaultValue="med">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <label htmlFor="j-link">Job link</label>
          <input id="j-link" name="job_link" type="url" placeholder="https://…" />
          <div className="grid-2">
            <div>
              <label htmlFor="j-loc">Location</label>
              <input id="j-loc" name="location" placeholder="Remote / NYC" />
            </div>
            <div>
              <label htmlFor="j-salary">Salary range</label>
              <input id="j-salary" name="salary_range" placeholder="$120k–150k" />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label htmlFor="j-deadline">Deadline (apply by)</label>
              <input id="j-deadline" name="deadline" type="date" />
            </div>
            <div>
              <label htmlFor="j-followup">Follow-up on</label>
              <input id="j-followup" name="follow_up_at" type="date" />
            </div>
          </div>
          <label htmlFor="j-applied">Applied on</label>
          <input id="j-applied" name="applied_at" type="date" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
            <input name="remote" type="checkbox" style={{ width: 'auto' }} /> Remote
          </label>
          <label htmlFor="j-notes">Notes</label>
          <textarea id="j-notes" name="notes" placeholder="Anything worth remembering" />
          <button className="mt" type="submit">Add job</button>
        </form>
      </div>
    </div>
  );
}
