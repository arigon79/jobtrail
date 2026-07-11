import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  createJob, updateJobStatus, updateJobPriority, deleteJob, toggleJobPin,
} from '@/app/actions/jobs';
import { PinButton } from '@/components/pin-button';
import { AutoSubmitSelect } from '@/components/auto-submit-select';
import { ReferralBadge } from '@/components/badges';
import {
  JOB_STATUSES, JOB_STATUS_LABELS, PRIORITIES, REFERRAL_STATUSES,
  type Company, type Job, type ReferralStatus,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const SORT_COLS = ['role', 'company', 'status', 'priority', 'posted', 'deadline', 'applied', 'created'] as const;
type SortCol = (typeof SORT_COLS)[number];

type Search = {
  q?: string; status?: string; company?: string; priority?: string;
  sort?: string; dir?: string;
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from('jobs').select('*');
  if (sp.status) query = query.eq('status', sp.status);
  if (sp.company) query = query.eq('company_id', sp.company);
  if (sp.priority) query = query.eq('priority', sp.priority);

  const [{ data: jobs }, { data: companies }, { data: referrals }] = await Promise.all([
    query,
    supabase.from('companies').select('*').order('name'),
    supabase.from('referrals').select('job_id, status'),
  ]);

  const cos = (companies ?? []) as Company[];
  const coName = new Map(cos.map((c) => [c.id, c.name]));

  // Per-job referral signal: keep the furthest-along status when a job has
  // several referral asks. Precedence runs positive → negative.
  const REF_ORDER: ReferralStatus[] = ['referred', 'agreed', 'asked', 'to_ask', 'no_response', 'declined'];
  const refByJob = new Map<string, ReferralStatus>();
  for (const r of (referrals ?? []) as { job_id: string | null; status: ReferralStatus }[]) {
    if (!r.job_id || !REFERRAL_STATUSES.includes(r.status)) continue;
    const cur = refByJob.get(r.job_id);
    if (!cur || REF_ORDER.indexOf(r.status) < REF_ORDER.indexOf(cur)) refByJob.set(r.job_id, r.status);
  }

  // Free-text search across role + company name.
  const q = (sp.q ?? '').trim().toLowerCase();
  let list = (jobs ?? []) as Job[];
  if (q) {
    list = list.filter((j) => {
      const co = j.company_id ? coName.get(j.company_id) ?? '' : '';
      return j.role.toLowerCase().includes(q) || co.toLowerCase().includes(q);
    });
  }

  // Sort: pinned always float to the top; the chosen column orders the rest.
  const sortCol: SortCol = (SORT_COLS as readonly string[]).includes(sp.sort ?? '')
    ? (sp.sort as SortCol)
    : 'created';
  const dir: 'asc' | 'desc' =
    sp.dir === 'asc' || sp.dir === 'desc' ? sp.dir : sortCol === 'created' ? 'desc' : 'asc';

  const coOf = (j: Job) => (j.company_id ? coName.get(j.company_id) ?? '' : '');
  const cmp = (a: Job, b: Job): number => {
    switch (sortCol) {
      case 'role': return a.role.localeCompare(b.role);
      case 'company': return coOf(a).localeCompare(coOf(b));
      case 'status': return JOB_STATUSES.indexOf(a.status) - JOB_STATUSES.indexOf(b.status);
      case 'priority': return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      case 'posted': return (a.posted_at ?? '￿').localeCompare(b.posted_at ?? '￿');
      case 'deadline': return (a.deadline ?? '￿').localeCompare(b.deadline ?? '￿');
      case 'applied': return (a.applied_at ?? '￿').localeCompare(b.applied_at ?? '￿');
      case 'created': return a.created_at.localeCompare(b.created_at);
    }
  };
  list = [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const c = cmp(a, b);
    return dir === 'asc' ? c : -c;
  });

  const filtered = Boolean(q || sp.status || sp.company || sp.priority);

  // Build a sortable header cell that preserves the active search/filters.
  function Th({ col, label, className }: { col: SortCol; label: string; className?: string }) {
    const active = sortCol === col;
    const nextDir = active && dir === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams();
    if (sp.q) params.set('q', sp.q);
    if (sp.status) params.set('status', sp.status);
    if (sp.company) params.set('company', sp.company);
    if (sp.priority) params.set('priority', sp.priority);
    params.set('sort', col);
    params.set('dir', nextDir);
    return (
      <th className={`${className ?? ''}${active ? ' sorted' : ''}`.trim() || undefined}>
        <Link href={`/jobs?${params.toString()}`}>
          {label}
          {active && <span className="sort-arrow" aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>}
        </Link>
      </th>
    );
  }

  return (
    <div className="page-wide">
      <div className="page-head">
        <div>
          <h1>Tracker</h1>
          <p className="subtitle" style={{ margin: 0 }}>{list.length} {filtered ? 'match your search' : list.length === 1 ? 'application' : 'applications'}.</p>
        </div>
        <details className="add-job">
          <summary className="btn">+ Add job</summary>
          <div className="add-job-form panel">
            <form action={createJob}>
              <div className="grid-2">
                <div>
                  <label htmlFor="j-role">Role *</label>
                  <input id="j-role" name="role" required placeholder="Software Engineer" />
                </div>
                <div>
                  <label htmlFor="j-company">Company</label>
                  <input id="j-company" name="company" list="company-names" placeholder="Pick or type a new one" autoComplete="off" />
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
                  <label htmlFor="j-posted">Posted on</label>
                  <input id="j-posted" name="posted_at" type="date" />
                </div>
                <div>
                  <label htmlFor="j-deadline">Deadline (apply by)</label>
                  <input id="j-deadline" name="deadline" type="date" />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="j-followup">Follow-up on</label>
                  <input id="j-followup" name="follow_up_at" type="date" />
                </div>
                <div>
                  <label htmlFor="j-applied">Applied on</label>
                  <input id="j-applied" name="applied_at" type="date" />
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
                <input name="remote" type="checkbox" style={{ width: 'auto' }} /> Remote
              </label>
              <label htmlFor="j-notes">Notes</label>
              <textarea id="j-notes" name="notes" placeholder="Anything worth remembering" />
              <button className="mt" type="submit">Add job</button>
            </form>
          </div>
        </details>
      </div>

      <form method="get" aria-label="Search and filter jobs">
        <div className="search" style={{ marginBottom: 12 }}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input name="q" defaultValue={sp.q ?? ''} placeholder="Search by role or company…" aria-label="Search jobs" type="search" />
        </div>
        <div className="row">
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
          {/* keep the active sort when re-filtering */}
          <input type="hidden" name="sort" value={sortCol} />
          <input type="hidden" name="dir" value={dir} />
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
        </div>
      </form>

      {/* Shared list of existing companies — the add-job company input can pick
          one or type a new name, which createJob will create on the fly. */}
      <datalist id="company-names">
        {cos.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>

      <div className="sheet-wrap mt">
        <table className="sheet">
          <thead>
            <tr>
              <th aria-label="Pin" />
              <th className="rownum">#</th>
              <Th col="role" label="Role" />
              <Th col="company" label="Company" />
              <Th col="status" label="Status" />
              <Th col="priority" label="Priority" />
              <th>Location</th>
              <th className="center">Remote</th>
              <th>Salary</th>
              <Th col="posted" label="Posted" />
              <Th col="deadline" label="Deadline" />
              <Th col="applied" label="Applied" />
              <th>Follow-up</th>
              <th>Referral</th>
              <th aria-label="Delete" />
            </tr>
          </thead>

          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={15}>
                  <div className="sheet-empty">
                    <span className="sheet-empty-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                        <path d="M10 7V5h4v2" />
                        <path d="M2 13h20" />
                      </svg>
                    </span>
                    <h3>{filtered ? 'No matches' : 'No applications yet'}</h3>
                    <p>{filtered ? 'Try a different search or clear the filters.' : 'Use the “+ Add job” button above to add your first application.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((j, i) => (
                <tr key={j.id} className={j.pinned ? 'pinned' : undefined}>
                  <td className="pin-cell">
                    <PinButton action={toggleJobPin} id={j.id} pinned={j.pinned} label={j.role} />
                  </td>
                  <td className="rownum">{i + 1}</td>
                  <td className="cell-role"><Link href={`/jobs/${j.id}`}>{j.role}</Link></td>
                  <td className="muted">{coOf(j) || '—'}</td>
                  <td className="cell-select">
                    <AutoSubmitSelect action={updateJobStatus} id={j.id} name="status" defaultValue={j.status} ariaLabel={`Status for ${j.role}`}>
                      {JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
                    </AutoSubmitSelect>
                  </td>
                  <td className="cell-select">
                    <AutoSubmitSelect action={updateJobPriority} id={j.id} name="priority" defaultValue={j.priority} ariaLabel={`Priority for ${j.role}`}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </AutoSubmitSelect>
                  </td>
                  <td className="muted">{j.location ?? '—'}</td>
                  <td className="center">{j.remote ? '✓' : <span className="faint">—</span>}</td>
                  <td className="muted">{j.salary_range ?? '—'}</td>
                  <td className="num muted">{j.posted_at ?? '—'}</td>
                  <td className="num muted">{j.deadline ?? '—'}</td>
                  <td className="num muted">{j.applied_at ?? '—'}</td>
                  <td className="num muted">{j.follow_up_at ?? '—'}</td>
                  <td>
                    {refByJob.has(j.id)
                      ? <ReferralBadge status={refByJob.get(j.id)!} />
                      : <span className="faint">—</span>}
                  </td>
                  <td className="row-del">
                    <form action={deleteJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button type="submit" aria-label={`Delete ${j.role}`} title="Delete">✕</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="sheet-hint">
        Tip: change a Status or Priority dropdown and it saves instantly. Click a column header to sort. Use the pin to keep a job on top. Add jobs with the “+ Add job” button up top.
      </p>
    </div>
  );
}
