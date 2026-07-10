import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, PriorityBadge } from '@/components/badges';
import type { Company, Contact, Job, Resume } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
    </div>
  );
}
