import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createCompany, deleteCompany, toggleCompanyPin } from '@/app/actions/companies';
import { PinButton } from '@/components/pin-button';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Search = { q?: string; dir?: string };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const dir: 'asc' | 'desc' = sp.dir === 'desc' ? 'desc' : 'asc';
  const [{ data }, { data: jobRows }] = await Promise.all([
    supabase
      .from('companies')
      .select('*')
      .order('pinned', { ascending: false })
      .order('name', { ascending: dir === 'asc' }),
    supabase.from('jobs').select('company_id'),
  ]);
  const all = (data ?? []) as Company[];

  // Count applications per company for the "Jobs" column.
  const jobCount = new Map<string, number>();
  for (const j of (jobRows ?? []) as { company_id: string | null }[]) {
    if (j.company_id) jobCount.set(j.company_id, (jobCount.get(j.company_id) ?? 0) + 1);
  }

  const q = (sp.q ?? '').trim().toLowerCase();
  const companies = q
    ? all.filter((c) =>
        [c.name, c.notes ?? '', c.website ?? ''].some((f) => f.toLowerCase().includes(q)),
      )
    : all;

  const nameSort = new URLSearchParams();
  if (sp.q) nameSort.set('q', sp.q);
  nameSort.set('dir', dir === 'asc' ? 'desc' : 'asc');

  const F = 'company-quick-add';

  return (
    <div>
      <h1>Companies</h1>
      <p className="subtitle">{companies.length} {q ? 'match your search' : 'tracked'}</p>

      <form method="get" aria-label="Search companies">
        <div className="toolbar">
          <div className="search">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input name="q" defaultValue={sp.q ?? ''} placeholder="Search companies…" aria-label="Search companies" type="search" />
          </div>
          <button type="submit">Search</button>
          {q && <Link className="btn secondary" href="/companies">Clear</Link>}
        </div>
      </form>

      <form id={F} action={createCompany} />

      <div className="sheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th aria-label="Pin" />
              <th className="rownum">#</th>
              <th className="sorted">
                <Link href={`/companies?${nameSort.toString()}`}>
                  Name <span className="sort-arrow" aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>
                </Link>
              </th>
              <th className="center">Jobs</th>
              <th>Website</th>
              <th>Notes</th>
              <th aria-label="Delete" />
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                  {q ? 'No companies match — try a different search.' : 'No companies yet. Add one in the row below.'}
                </td>
              </tr>
            ) : (
              companies.map((c, i) => (
                <tr key={c.id} className={c.pinned ? 'pinned' : undefined}>
                  <td className="pin-cell">
                    <PinButton action={toggleCompanyPin} id={c.id} pinned={c.pinned} label={c.name} />
                  </td>
                  <td className="rownum">{i + 1}</td>
                  <td className="cell-role"><Link href={`/companies/${c.id}`}>{c.name}</Link></td>
                  <td className="center">
                    {jobCount.get(c.id) ? (
                      <Link href={`/jobs?company=${c.id}`}>{jobCount.get(c.id)}</Link>
                    ) : (
                      <span className="faint">0</span>
                    )}
                  </td>
                  <td>{c.website ? <a href={c.website} target="_blank" rel="noreferrer">Site ↗</a> : <span className="faint">—</span>}</td>
                  <td className="muted">{c.notes ?? '—'}</td>
                  <td className="row-del">
                    <form action={deleteCompany}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" aria-label={`Delete ${c.name}`} title="Delete">✕</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pin-cell" />
              <td className="rownum">+</td>
              <td><input form={F} name="name" required placeholder="New company…" aria-label="New company name" /></td>
              <td className="center faint">—</td>
              <td><input form={F} name="website" type="url" placeholder="https://…" aria-label="New company website" /></td>
              <td><input form={F} name="notes" placeholder="Notes" aria-label="New company notes" /></td>
              <td><button form={F} type="submit" className="add-btn">Add</button></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="sheet-hint">Add a company along the bottom row. Click the pin to keep one on top; the header sorts by name.</p>
    </div>
  );
}
