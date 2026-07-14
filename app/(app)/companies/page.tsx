import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createCompany, deleteCompany } from '@/app/actions/companies';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('companies').select('*').order('name');
  const companies = (data ?? []) as Company[];

  return (
    <div>
      <h1>Companies</h1>
      <p className="subtitle">{companies.length} tracked</p>

      {companies.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">🏢</div>
          <h3>No companies yet</h3>
          <p>Add the companies you are targeting. Jobs, contacts, and resumes all link to them.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Website</th><th>Notes</th><th></th></tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Name" style={{ fontWeight: 600 }}><Link href={`/companies/${c.id}`}>{c.name}</Link></td>
                    <td data-label="Website">{c.website ? <a href={c.website} target="_blank" rel="noreferrer">Site ↗</a> : <span className="faint">—</span>}</td>
                    <td data-label="Notes" className="muted">{c.notes ?? '—'}</td>
                    <td data-label="Actions" className="right">
                      <form action={deleteCompany}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="secondary sm danger" type="submit" aria-label={`Delete ${c.name}`}>
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2>Add a company</h2>
      <div className="panel">
        <form action={createCompany}>
          <label htmlFor="co-name">Name *</label>
          <input id="co-name" name="name" required placeholder="Acme Inc" />
          <label htmlFor="co-website">Website</label>
          <input id="co-website" name="website" type="url" placeholder="https://acme.com" />
          <label htmlFor="co-notes">Notes</label>
          <textarea id="co-notes" name="notes" />
          <button className="mt" type="submit">Add company</button>
        </form>
      </div>
    </div>
  );
}
