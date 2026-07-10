import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createContact, deleteContact } from '@/app/actions/contacts';
import type { Company, Contact } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const supabase = await createClient();
  const [{ data: contactsData }, { data: companiesData }] = await Promise.all([
    supabase.from('contacts').select('*').order('name'),
    supabase.from('companies').select('*').order('name'),
  ]);

  const contacts = (contactsData ?? []) as Contact[];
  const companies = (companiesData ?? []) as Company[];
  const coName = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <div>
      <h1>Contacts</h1>
      <p className="subtitle">People you can ask for referrals.</p>

      {companies.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">🏢</div>
          <h3>Add a company first</h3>
          <p>Contacts are tied to a company. Create one to start adding people.</p>
          <Link className="btn" href="/companies">Go to Companies</Link>
        </div>
      ) : (
        <>
          {contacts.length === 0 ? (
            <div className="empty">
              <div className="icon" aria-hidden="true">👥</div>
              <h3>No contacts yet</h3>
              <p>Add someone you could reach out to for a referral.</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Company</th><th>Role</th><th>LinkedIn</th><th></th></tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td className="muted">{coName.get(c.company_id) ?? '—'}</td>
                        <td className="muted">{c.role ?? '—'}</td>
                        <td>
                          {c.linkedin_url ? (
                            <a href={c.linkedin_url} target="_blank" rel="noreferrer">Profile ↗</a>
                          ) : (
                            <span className="faint">—</span>
                          )}
                        </td>
                        <td className="right">
                          <form action={deleteContact}>
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

          <h2>Add a contact</h2>
          <div className="panel">
            <form action={createContact}>
              <div className="grid-2">
                <div>
                  <label htmlFor="c-name">Name *</label>
                  <input id="c-name" name="name" required placeholder="Jane Doe" />
                </div>
                <div>
                  <label htmlFor="c-company">Company *</label>
                  <select id="c-company" name="company_id" required defaultValue="">
                    <option value="" disabled>Select a company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="c-role">Role / title</label>
                  <input id="c-role" name="role" placeholder="Engineering Manager" />
                </div>
                <div>
                  <label htmlFor="c-linkedin">LinkedIn URL</label>
                  <input id="c-linkedin" name="linkedin_url" type="url" placeholder="https://linkedin.com/in/…" />
                </div>
              </div>
              <label htmlFor="c-notes">Notes</label>
              <textarea id="c-notes" name="notes" placeholder="How you know them, context…" />
              <button className="mt" type="submit">Add contact</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
