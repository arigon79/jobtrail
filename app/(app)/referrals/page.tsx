import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createReferral, updateReferralStatus, deleteReferral } from '@/app/actions/referrals';
import {
  REFERRAL_STATUSES,
  type Contact, type Job, type Referral, type ReferralStatus,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<ReferralStatus, string> = {
  to_ask: 'To ask', asked: 'Asked', agreed: 'Agreed',
  referred: 'Referred', declined: 'Declined', no_response: 'No response',
};

export default async function ReferralsPage() {
  const supabase = await createClient();
  const [{ data: refData }, { data: contactsData }, { data: jobsData }] = await Promise.all([
    supabase.from('referrals').select('*').order('created_at', { ascending: false }),
    supabase.from('contacts').select('*').order('name'),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
  ]);

  const referrals = (refData ?? []) as Referral[];
  const contacts = (contactsData ?? []) as Contact[];
  const jobs = (jobsData ?? []) as Job[];
  const contactName = new Map(contacts.map((c) => [c.id, c.name]));
  const jobRole = new Map(jobs.map((j) => [j.id, j.role]));

  const byStatus = (s: ReferralStatus) => referrals.filter((r) => r.status === s);

  return (
    <div>
      <h1>Referrals</h1>
      <p className="subtitle">{referrals.length} asks across the pipeline.</p>

      {contacts.length === 0 ? (
        <div className="empty">
          <div className="icon" aria-hidden="true">🤝</div>
          <h3>Add a contact first</h3>
          <p>Referrals link a person to a job. Add someone on the Contacts page.</p>
          <Link className="btn" href="/contacts">Go to Contacts</Link>
        </div>
      ) : (
        <>
          {referrals.length === 0 ? (
            <div className="empty">
              <div className="icon" aria-hidden="true">📮</div>
              <h3>No referral asks yet</h3>
              <p>Track who you asked and where each request stands.</p>
            </div>
          ) : (
            <div className="pipeline" role="list" aria-label="Referral pipeline">
              {REFERRAL_STATUSES.map((s) => {
                const items = byStatus(s);
                return (
                  <section key={s} className="col" role="listitem" aria-label={STATUS_LABEL[s]}>
                    <div className="head">
                      <span>{STATUS_LABEL[s]}</span>
                      <span className="count">{items.length}</span>
                    </div>
                    {items.map((r) => (
                      <div key={r.id} className="chip">
                        <div className="who">{contactName.get(r.contact_id) ?? 'Unknown'}</div>
                        <div className="meta">
                          {r.job_id ? (jobRole.get(r.job_id) ?? 'job') : 'no job linked'}
                          {r.asked_at ? ` · asked ${r.asked_at}` : ''}
                        </div>
                        <div className="inline-actions mt" style={{ marginTop: 8 }}>
                          <form action={updateReferralStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <select name="status" defaultValue={r.status} aria-label="Change referral status">
                              {REFERRAL_STATUSES.map((x) => (
                                <option key={x} value={x}>{STATUS_LABEL[x]}</option>
                              ))}
                            </select>
                            <button className="secondary sm mt" type="submit">Move</button>
                          </form>
                          <form action={deleteReferral}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="secondary sm danger" type="submit" aria-label="Delete referral">✕</button>
                          </form>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <p className="faint" style={{ fontSize: 12 }}>Empty</p>}
                  </section>
                );
              })}
            </div>
          )}

          <h2>New referral ask</h2>
          <div className="panel">
            <form action={createReferral}>
              <div className="grid-2">
                <div>
                  <label htmlFor="r-contact">Contact *</label>
                  <select id="r-contact" name="contact_id" required defaultValue="">
                    <option value="" disabled>Select a person</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="r-job">Job (optional)</label>
                  <select id="r-job" name="job_id" defaultValue="">
                    <option value="">— none —</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.role}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="r-status">Status</label>
                  <select id="r-status" name="status" defaultValue="to_ask">
                    {REFERRAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="r-asked">Asked on</label>
                  <input id="r-asked" name="asked_at" type="date" />
                </div>
              </div>
              <label htmlFor="r-notes">Notes</label>
              <textarea id="r-notes" name="notes" />
              <button className="mt" type="submit">Add referral</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
