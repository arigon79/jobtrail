import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, PriorityBadge } from '@/components/badges';
import { updateReferralStatus, deleteReferral } from '@/app/actions/referrals';
import {
  REFERRAL_STATUSES,
  type Company, type Contact, type Job, type Referral, type ReferralStatus, type Resume,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  to_ask: 'To ask', asked: 'Asked', agreed: 'Agreed',
  referred: 'Referred', declined: 'Declined', no_response: 'No response',
};

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: companyData } = await supabase.from('companies').select('*').eq('id', id).single();
  if (!companyData) notFound();
  const company = companyData as Company;

  const [{ data: jobsData }, { data: contactsData }, { data: resumeData }] = await Promise.all([
    supabase.from('jobs').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    supabase.from('contacts').select('*').eq('company_id', id).order('name'),
    supabase.from('resumes').select('*').eq('company_id', id).maybeSingle(),
  ]);

  const jobs = (jobsData ?? []) as Job[];
  const contacts = (contactsData ?? []) as Contact[];
  const resume = (resumeData ?? null) as Resume | null;

  // Referrals tied to this company's contacts.
  const contactIds = contacts.map((c) => c.id);
  const { data: refData } = contactIds.length
    ? await supabase
        .from('referrals')
        .select('*')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false })
    : { data: [] };
  const referrals = (refData ?? []) as Referral[];
  const contactName = new Map(contacts.map((c) => [c.id, c.name]));
  const jobRole = new Map(jobs.map((j) => [j.id, j.role]));

  return (
    <div>
      <p><Link href="/companies">← Companies</Link></p>
      <h1>{company.name}</h1>
      <p className="subtitle">
        {company.website ? (
          <a href={company.website} target="_blank" rel="noreferrer">{company.website} ↗</a>
        ) : (
          <span className="faint">No website</span>
        )}
      </p>

      {company.notes && (
        <div className="panel" style={{ whiteSpace: 'pre-wrap' }}>{company.notes}</div>
      )}

      {/* Resume */}
      <h2>Resume for this company</h2>
      {resume ? (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{resume.label}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
              </div>
            </div>
            <a className="btn secondary sm" href={`/resumes/${resume.id}/download`} target="_blank" rel="noreferrer">
              Download
            </a>
          </div>
        </div>
      ) : (
        <div className="empty">
          <div className="icon" aria-hidden="true">📄</div>
          <h3>No resume for {company.name}</h3>
          <p>Upload one tailored to this company.</p>
          <Link className="btn" href="/resumes">Upload a resume</Link>
        </div>
      )}

      {/* Jobs */}
      <h2>Jobs at {company.name} ({jobs.length})</h2>
      {jobs.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">🗂️</div>
          <h3>No jobs yet</h3>
          <p>Add an application and link it to this company.</p>
          <Link className="btn" href="/jobs">Add a job</Link>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Role</th><th>Priority</th><th>Status</th><th>Deadline</th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 600 }}><Link href={`/jobs/${j.id}`}>{j.role}</Link></td>
                    <td><PriorityBadge priority={j.priority} /></td>
                    <td><StatusBadge status={j.status} /></td>
                    <td className="muted">{j.deadline ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contacts */}
      <h2>Contacts at {company.name} ({contacts.length})</h2>
      {contacts.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">👥</div>
          <h3>No contacts yet</h3>
          <p>Add someone here you could ask for a referral.</p>
          <Link className="btn" href="/contacts">Add a contact</Link>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>LinkedIn</th></tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="muted">{c.role ?? '—'}</td>
                    <td>
                      {c.linkedin_url ? (
                        <a href={c.linkedin_url} target="_blank" rel="noreferrer">Profile ↗</a>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Referrals */}
      <h2>Referrals at {company.name} ({referrals.length})</h2>
      {referrals.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">🤝</div>
          <h3>No referral asks yet</h3>
          <p>Track referral requests to contacts here.</p>
          <Link className="btn" href="/referrals">Add a referral</Link>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Person</th><th>Job</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{contactName.get(r.contact_id) ?? 'Unknown'}</td>
                    <td className="muted">{r.job_id ? (jobRole.get(r.job_id) ?? 'job') : '—'}</td>
                    <td>
                      <form action={updateReferralStatus} className="inline-actions">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="company_id" value={company.id} />
                        <select name="status" defaultValue={r.status} aria-label="Change referral status">
                          {REFERRAL_STATUSES.map((x) => (
                            <option key={x} value={x}>{REFERRAL_STATUS_LABEL[x]}</option>
                          ))}
                        </select>
                        <button className="secondary sm" type="submit">Save</button>
                      </form>
                    </td>
                    <td className="right">
                      <form action={deleteReferral}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="company_id" value={company.id} />
                        <button className="secondary sm danger" type="submit" aria-label="Delete referral">✕</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
