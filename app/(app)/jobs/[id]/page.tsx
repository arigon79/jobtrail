import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addInterview, deleteInterview } from '@/app/actions/interviews';
import { updateJob } from '@/app/actions/jobs';
import { addJobReferral, deleteReferral } from '@/app/actions/referrals';
import { uploadJobAttachment, deleteJobAttachment } from '@/app/actions/attachments';
import { shareEvent } from '@/app/actions/social';
import { StatusBadge, PriorityBadge, OutcomeBadge, ReferralBadge } from '@/components/badges';
import { JobProgress } from '@/components/job-progress';
import {
  ATTACHMENT_KINDS, ATTACHMENT_KIND_LABELS,
  INTERVIEW_KINDS, INTERVIEW_OUTCOMES, JOB_STATUSES, JOB_STATUS_LABELS, PRIORITIES, REFERRAL_STATUSES,
  type Attachment, type Company, type Contact, type Interview, type Job, type Referral,
} from '@/lib/types';

function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Map a tracker status to the feed verb it makes sense to share as.
function statusToVerb(status: string): 'applied' | 'interview' | 'offer' | 'accepted' | 'rejected' {
  if (status === 'interview' || status === 'final' || status === 'phone_screen' || status === 'oa') return 'interview';
  if (status === 'offer') return 'offer';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected' || status === 'withdrawn' || status === 'ghosted') return 'rejected';
  return 'applied';
}

export const dynamic = 'force-dynamic';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (!job) notFound();
  const j = job as Job;

  const [{ data: company }, { data: interviews }, { data: companiesData }, { data: contactsData }, { data: referralsData }, { data: attachmentsData }] = await Promise.all([
    j.company_id
      ? supabase.from('companies').select('*').eq('id', j.company_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('interviews').select('*').eq('job_id', id).order('scheduled_at'),
    supabase.from('companies').select('id, name').order('name'),
    j.company_id
      ? supabase.from('contacts').select('id, name, role').eq('company_id', j.company_id).order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('referrals').select('id, contact_id, status, asked_at').eq('job_id', id),
    supabase.from('attachments').select('*').eq('job_id', id).order('uploaded_at', { ascending: false }),
  ]);

  const co = company as Company | null;

  // Referral hint: friends whose current company matches this job's company.
  // profiles RLS already restricts this to people I'm linked with.
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  let friendsHere: { display_name: string; handle: string }[] = [];
  if (co?.name) {
    const { data: fh } = await supabase
      .from('profiles')
      .select('display_name, handle')
      .ilike('current_company', co.name)
      .neq('id', me ?? '');
    friendsHere = (fh as { display_name: string; handle: string }[] | null) ?? [];
  }

  const rounds = (interviews ?? []) as Interview[];
  const cos = (companiesData ?? []) as Pick<Company, 'id' | 'name'>[];
  const people = (contactsData ?? []) as Pick<Contact, 'id' | 'name' | 'role'>[];
  const jobReferrals = (referralsData ?? []) as Pick<Referral, 'id' | 'contact_id' | 'status' | 'asked_at'>[];
  const attachments = (attachmentsData ?? []) as Attachment[];
  const personName = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div>
      <p><Link href="/jobs">← Jobs</Link></p>
      <h1>{j.role}</h1>
      <p className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>{co ? co.name : 'No company'}</span>
        <StatusBadge status={j.status} />
        <PriorityBadge priority={j.priority} />
      </p>

      <JobProgress status={j.status} />

      {friendsHere.length > 0 && (
        <div className="panel mt" style={{ borderColor: 'var(--green)' }}>
          <strong>💡 Referral hint:</strong>{' '}
          {friendsHere.map((f, i) => (
            <span key={f.handle}>
              {i > 0 ? ', ' : ''}{f.display_name} <span className="muted">@{f.handle}</span>
            </span>
          ))}{' '}
          {friendsHere.length === 1 ? 'works' : 'work'} at {co?.name}. Ask for a referral?
        </div>
      )}

      <div className="panel mt">
        <form action={shareEvent} className="row" style={{ alignItems: 'end' }}>
          <input type="hidden" name="verb" value={statusToVerb(j.status)} />
          <input type="hidden" name="company_name" value={co?.name ?? ''} />
          <input type="hidden" name="role" value={j.role} />
          <input type="hidden" name="job_id" value={j.id} />
          <div style={{ flex: 1 }}>
            <label htmlFor="share-note">Share this to your feed</label>
            <input id="share-note" name="body" placeholder="Optional note for friends…" />
          </div>
          <button type="submit">Share update</button>
        </form>
      </div>

      <datalist id="company-names">
        {cos.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>

      <div className="panel">
        <form action={updateJob}>
          <input type="hidden" name="id" value={j.id} />

          <div className="grid-2">
            <div>
              <label htmlFor="e-role">Role *</label>
              <input id="e-role" name="role" required defaultValue={j.role} />
            </div>
            <div>
              <label htmlFor="e-company">Company</label>
              <input id="e-company" name="company" list="company-names" defaultValue={co?.name ?? ''} placeholder="Pick or type a new one" autoComplete="off" />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="e-status">Status</label>
              <select id="e-status" name="status" defaultValue={j.status}>
                {JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="e-priority">Priority</label>
              <select id="e-priority" name="priority" defaultValue={j.priority}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <label htmlFor="e-link">Job link</label>
          <input id="e-link" name="job_link" type="url" defaultValue={j.job_link ?? ''} placeholder="https://…" />

          <div className="grid-2">
            <div>
              <label htmlFor="e-loc">Location</label>
              <input id="e-loc" name="location" defaultValue={j.location ?? ''} placeholder="Remote / NYC" />
            </div>
            <div>
              <label htmlFor="e-salary">Salary range</label>
              <input id="e-salary" name="salary_range" defaultValue={j.salary_range ?? ''} placeholder="$120k–150k" />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="e-posted">Posted on</label>
              <input id="e-posted" name="posted_at" type="date" defaultValue={j.posted_at ?? ''} />
            </div>
            <div>
              <label htmlFor="e-deadline">Deadline (apply by)</label>
              <input id="e-deadline" name="deadline" type="date" defaultValue={j.deadline ?? ''} />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="e-applied">Applied on</label>
              <input id="e-applied" name="applied_at" type="date" defaultValue={j.applied_at ?? ''} />
            </div>
            <div>
              <label htmlFor="e-followup">Follow-up on</label>
              <input id="e-followup" name="follow_up_at" type="date" defaultValue={j.follow_up_at ?? ''} />
            </div>
          </div>

          <label htmlFor="e-offer">Offer amount</label>
          <input id="e-offer" name="offer_amount" type="number" step="any" defaultValue={j.offer_amount ?? ''} placeholder="150000" />
          <input type="hidden" name="offer_currency" value={j.offer_currency ?? 'USD'} />

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
            <input name="remote" type="checkbox" defaultChecked={j.remote} style={{ width: 'auto' }} /> Remote
          </label>

          <label htmlFor="e-notes">Notes</label>
          <textarea id="e-notes" name="notes" defaultValue={j.notes ?? ''} placeholder="Anything worth remembering" />

          <button className="mt" type="submit">Save changes</button>
        </form>
      </div>

      <h2>Attachments</h2>
      <div className="panel">
        {attachments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Document</th><th>Type</th><th>Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                {attachments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>
                      {a.label}
                      {a.size_bytes ? <span className="faint" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{fmtSize(a.size_bytes)}</span> : null}
                    </td>
                    <td className="muted">{ATTACHMENT_KIND_LABELS[a.kind]}</td>
                    <td className="muted">{new Date(a.uploaded_at).toLocaleDateString()}</td>
                    <td className="right">
                      <div className="inline-actions">
                        {a.mime_type === 'application/pdf' && (
                          <a className="btn secondary sm" href={`/attachments/${a.id}/download`} target="_blank" rel="noreferrer">View</a>
                        )}
                        <a className="btn secondary sm" href={`/attachments/${a.id}/download?download=1`}>Download</a>
                        <form action={deleteJobAttachment}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="job_id" value={j.id} />
                          <button className="secondary sm danger" type="submit" aria-label={`Delete ${a.label}`}>Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No files yet. Attach a resume, CV, cover letter, or other document.</p>
        )}

        <form action={uploadJobAttachment} className="mt">
          <input type="hidden" name="job_id" value={j.id} />
          <div className="grid-2">
            <div>
              <label htmlFor="at-label">Label</label>
              <input id="at-label" name="label" placeholder="Defaults to the file name" />
            </div>
            <div>
              <label htmlFor="at-kind">Type</label>
              <select id="at-kind" name="kind" defaultValue="resume">
                {ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{ATTACHMENT_KIND_LABELS[k]}</option>)}
              </select>
            </div>
          </div>
          <label htmlFor="at-file">File * — PDF or Word (.doc/.docx), max 10 MB</label>
          <input id="at-file" name="file" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
          <button className="mt" type="submit">Upload attachment</button>
        </form>
      </div>

      <h2>Referrals for this role</h2>
      <div className="panel">
        {jobReferrals.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Person</th><th>Status</th><th>Asked</th><th></th></tr>
              </thead>
              <tbody>
                {jobReferrals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{personName.get(r.contact_id) ?? '—'}</td>
                    <td><ReferralBadge status={r.status} /></td>
                    <td className="muted">{r.asked_at ?? '—'}</td>
                    <td className="right">
                      <form action={deleteReferral}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="job_id" value={j.id} />
                        <button className="secondary sm danger" type="submit" aria-label="Delete referral">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No referrals asked yet for this role.</p>
        )}

        {!co && (
          <p className="err" style={{ marginTop: 12 }}>
            Assign a company above to pick or add people for a referral.
          </p>
        )}

        <form action={addJobReferral} className="mt">
          <input type="hidden" name="job_id" value={j.id} />
          <div className="grid-2">
            <div>
              <label htmlFor="ref-contact">Existing person{co ? ` at ${co.name}` : ''}</label>
              <select id="ref-contact" name="contact_id" defaultValue="" disabled={!co}>
                <option value="">— select —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.role ? ` (${p.role})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ref-status">Referral status</label>
              <select id="ref-status" name="status" defaultValue="to_ask">
                {REFERRAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <p className="faint" style={{ fontSize: 12, margin: '14px 0 0' }}>…or add a new person (goes into {co ? co.name : 'the company'}’s contacts):</p>
          <div className="grid-2">
            <div>
              <label htmlFor="ref-newname">Name</label>
              <input id="ref-newname" name="new_name" placeholder="Jane Doe" disabled={!co} />
            </div>
            <div>
              <label htmlFor="ref-newrole">Their role</label>
              <input id="ref-newrole" name="new_role" placeholder="Engineering Manager" disabled={!co} />
            </div>
          </div>
          <label htmlFor="ref-newlinkedin">LinkedIn</label>
          <input id="ref-newlinkedin" name="new_linkedin" type="url" placeholder="https://linkedin.com/in/…" disabled={!co} />

          <label htmlFor="ref-asked">Asked on</label>
          <input id="ref-asked" name="asked_at" type="date" />

          <button className="mt" type="submit" disabled={!co}>Add referral</button>
        </form>
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
