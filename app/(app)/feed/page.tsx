import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { shareEvent, deleteEvent, reactToEvent, unreact, addComment, deleteComment } from '@/app/actions/social';
import {
  FEED_VERBS, FEED_VERB_LABELS,
  type FeedEvent, type Profile, type Reaction, type Comment,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

// "Jane applied to Stripe — Backend Engineer"
function headline(e: FeedEvent, actorName: string): string {
  if (e.verb === 'custom') return actorName;
  if (e.verb === 'open_to_work') return `${actorName} ${FEED_VERB_LABELS.open_to_work}`;
  const where = e.company_name ?? 'somewhere';
  const role = e.role ? ` — ${e.role}` : '';
  return `${actorName} ${FEED_VERB_LABELS[e.verb]} ${where}${role}`;
}

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('share_default, handle')
    .eq('id', me ?? '')
    .maybeSingle();

  // RLS scopes this to my own + accepted friends' events.
  const { data: eventRows } = await supabase
    .from('feed_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  const events = (eventRows ?? []) as FeedEvent[];

  const actorIds = [...new Set(events.map((e) => e.actor_id))];
  const eventIds = events.map((e) => e.id);

  const [{ data: profileRows }, { data: reactionRows }, { data: commentRows }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, handle')
      .in('id', actorIds.length ? actorIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('reactions').select('*')
      .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('comments').select('*')
      .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: true }),
  ]);

  const nameById = new Map(
    (profileRows as Pick<Profile, 'id' | 'display_name' | 'handle'>[] | null ?? [])
      .map((p) => [p.id, p]),
  );
  const reactions = (reactionRows as Reaction[] | null) ?? [];
  const comments = (commentRows as Comment[] | null) ?? [];

  const actorName = (id: string) => nameById.get(id)?.display_name ?? 'A friend';

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-head">
        <div>
          <h1>Feed</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            What you and your friends are up to.
          </p>
        </div>
        <Link href="/friends" className="ghost" role="button">Friends</Link>
      </div>

      {!myProfile?.handle && (
        <div className="panel mt" style={{ borderColor: 'var(--amber)' }}>
          <strong>Set up your profile</strong> to post and add friends.{' '}
          <Link href="/profile">Go to profile →</Link>
        </div>
      )}

      {/* Composer — explicit share, nothing is auto-posted from your tracker. */}
      <div className="panel mt">
        <form action={shareEvent}>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label htmlFor="verb">Share an update</label>
              <select id="verb" name="verb" defaultValue="applied">
                {FEED_VERBS.map((v) => (
                  <option key={v} value={v}>{v === 'custom' ? 'Just saying…' : FEED_VERB_LABELS[v] || v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="company_name">Company</label>
              <input id="company_name" name="company_name" placeholder="Stripe" />
            </div>
            <div>
              <label htmlFor="role">Role</label>
              <input id="role" name="role" placeholder="Backend Engineer" />
            </div>
          </div>
          <label htmlFor="body">Add a note (optional)</label>
          <textarea id="body" name="body" rows={2} placeholder="2nd round Friday 🤞" />
          <button className="mt" type="submit">Post to feed</button>
        </form>
      </div>

      <section className="mt">
        {events.length === 0 ? (
          <div className="empty">
            <div className="icon">📣</div>
            <h3>Nothing here yet</h3>
            <p>Post an update above, or add friends to see theirs.</p>
          </div>
        ) : (
          events.map((e) => {
            const evReactions = reactions.filter((r) => r.event_id === e.id);
            const evComments = comments.filter((c) => c.event_id === e.id);
            const iReacted = evReactions.some((r) => r.user_id === me && r.emoji === '👏');
            return (
              <article key={e.id} className="card" style={{ display: 'block', marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                  <div className="n">{headline(e, actorName(e.actor_id))}</div>
                  <span className="meta">{timeAgo(e.created_at)}</span>
                </div>
                {e.body && <p className="l" style={{ marginTop: 6 }}>{e.body}</p>}

                <div className="row" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <form action={iReacted ? unreact : reactToEvent}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <input type="hidden" name="emoji" value="👏" />
                    <button type="submit" className={iReacted ? '' : 'ghost'}>
                      👏 {evReactions.length || ''}
                    </button>
                  </form>
                  {e.actor_id === me && (
                    <form action={deleteEvent} style={{ marginLeft: 'auto' }}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="ghost">Delete</button>
                    </form>
                  )}
                </div>

                {evComments.length > 0 && (
                  <div className="mt" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {evComments.map((c) => (
                      <div key={c.id} className="chip" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <span className="who">{actorName(c.user_id)}</span>{' '}
                          <span>{c.body}</span>
                        </div>
                        {c.user_id === me && (
                          <form action={deleteComment}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="ghost" aria-label="Delete comment">×</button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form action={addComment} className="row mt" style={{ alignItems: 'end' }}>
                  <input type="hidden" name="event_id" value={e.id} />
                  <div style={{ flex: 1 }}>
                    <input name="body" placeholder="Comment…" required />
                  </div>
                  <button type="submit" className="ghost">Send</button>
                </form>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
