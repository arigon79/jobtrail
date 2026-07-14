import { createClient } from '@/lib/supabase/server';
import { uploadResume, deleteResume } from '@/app/actions/resumes';
import type { Company, Resume } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ResumesPage() {
  const supabase = await createClient();
  const [{ data: resumesData }, { data: companiesData }] = await Promise.all([
    supabase.from('resumes').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('companies').select('*').order('name'),
  ]);

  const resumes = (resumesData ?? []) as Resume[];
  const companies = (companiesData ?? []) as Company[];
  const coName = new Map(companies.map((c) => [c.id, c.name]));
  const usedCompanyIds = new Set(resumes.filter((r) => r.company_id).map((r) => r.company_id));

  return (
    <div>
      <h1>Resumes</h1>
      <p className="subtitle">One resume per company, plus general resumes. Stored privately in Supabase.</p>

      {resumes.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">📄</div>
          <h3>No resumes uploaded</h3>
          <p>Upload a PDF below — tie it to a company or keep it general.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Label</th><th>Company</th><th>Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Label" style={{ fontWeight: 600 }}>
                      {r.label}
                      {r.is_default && <span className="badge blue" style={{ marginLeft: 8 }}><span className="dot" aria-hidden="true" />general</span>}
                    </td>
                    <td data-label="Company" className="muted">{r.company_id ? coName.get(r.company_id) : 'General'}</td>
                    <td data-label="Uploaded" className="muted">{new Date(r.uploaded_at).toLocaleDateString()}</td>
                    <td data-label="Actions" className="right">
                      <div className="inline-actions">
                        <a className="btn secondary sm" href={`/resumes/${r.id}/download`} target="_blank" rel="noreferrer">
                          Download
                        </a>
                        <form action={deleteResume}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="secondary sm danger" type="submit" aria-label={`Delete ${r.label}`}>Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2>Upload a resume</h2>
      <div className="panel">
        <form action={uploadResume}>
          <div className="grid-2">
            <div>
              <label htmlFor="rs-label">Label *</label>
              <input id="rs-label" name="label" required placeholder="Backend-focused resume" />
            </div>
            <div>
              <label htmlFor="rs-company">Company</label>
              <select id="rs-company" name="company_id" defaultValue="">
                <option value="">General (no company)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{usedCompanyIds.has(c.id) ? ' — replaces existing' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="rs-file">PDF file * (max 10 MB)</label>
          <input id="rs-file" name="file" type="file" accept="application/pdf" required />
          <p className="faint mt" style={{ fontSize: 12, marginTop: 8 }}>
            Uploading for a company that already has a resume replaces the old one.
          </p>
          <button className="mt" type="submit">Upload</button>
        </form>
      </div>
    </div>
  );
}
