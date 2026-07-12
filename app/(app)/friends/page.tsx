import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from '@/app/actions/social';
import type { Friendship, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;

  // Do I have a public profile yet? Without a handle, nobody can find me.
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', me ?? '')
    .maybeSingle();

  // RLS returns only friendships I'm a party to.
  const { data: friendshipRows } = await supabase
    .from('friendships')
    .select('*')
    .order('created_at', { ascending: false });
  const friendships = (friendshipRows ?? []) as Friendship[];

  // Resolve the other person in each row. are_linked() lets me read their profile
  // even while the request is still pending.
  const otherIds = friendships.map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id));
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*')
    .in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000']);
  const byId = new Map((profileRows as Profile[] | null ?? []).map((p) => [p.id, p]));

  const other = (f: Friendship) => byId.get(f.requester_id === me ? f.addressee_id : f.requester_id);

  const accepted = friendships.filter((f) => f.status === 'accepted');
  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee_id === me);
  const sent = friendships.filter((f) => f.status === 'pending' && f.requester_id === me);

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-head">
        <div>
          <h1>Friends</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Add friends by handle to share your job hunt.
          </p>
        </div>
      </div>

      {!myProfile?.handle && (
        <div className="panel mt" style={{ borderColor: 'var(--amber)' }}>
          <strong>Set your handle first.</strong> Friends can only find you once you pick one.{' '}
          <Link href="/profile">Set up your public profile →</Link>
        </div>
      )}

      <div className="panel mt">
        <form action={sendFriendRequest} className="row" style={{ alignItems: 'end' }}>
          <div>
            <label htmlFor="handle">Add a friend</label>
            <input id="handle" name="handle" placeholder="@handle" required />
          </div>
          <button type="submit">Send request</button>
        </form>
      </div>

      {incoming.length > 0 && (
        <section className="mt">
          <h2>Requests ({incoming.length})</h2>
          {incoming.map((f) => {
            const p = other(f);
            return (
              <div key={f.id} className="chip" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="who">{p?.display_name ?? 'Someone'}</div>
                  <div className="meta">@{p?.handle}</div>
                </div>
                <div className="row" style={{ flex: 'none', gap: 8 }}>
                  <form action={respondToFriendRequest}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="accept" value="true" />
                    <button type="submit">Accept</button>
                  </form>
                  <form action={respondToFriendRequest}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="accept" value="false" />
                    <button type="submit" className="ghost">Decline</button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="mt">
        <h2>Your friends ({accepted.length})</h2>
        {accepted.length === 0 ? (
          <div className="empty">
            <div className="icon">👋</div>
            <h3>No friends yet</h3>
            <p>Send a request above, or share your @handle so friends can add you.</p>
          </div>
        ) : (
          accepted.map((f) => {
            const p = other(f);
            const friendId = f.requester_id === me ? f.addressee_id : f.requester_id;
            return (
              <div key={f.id} className="chip" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="who">{p?.display_name ?? 'Friend'}</div>
                  <div className="meta">
                    @{p?.handle}
                    {p?.current_company ? ` · ${p.current_company}` : ''}
                    {p?.open_to_work ? ' · open to work' : ''}
                  </div>
                </div>
                <form action={removeFriend}>
                  <input type="hidden" name="friend_id" value={friendId} />
                  <button type="submit" className="ghost">Remove</button>
                </form>
              </div>
            );
          })
        )}
      </section>

      {sent.length > 0 && (
        <section className="mt">
          <h2>Pending sent ({sent.length})</h2>
          {sent.map((f) => {
            const p = other(f);
            return (
              <div key={f.id} className="chip" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="who">{p?.display_name ?? 'Someone'}</div>
                  <div className="meta">@{p?.handle} · awaiting response</div>
                </div>
                <form action={removeFriend}>
                  <input type="hidden" name="friend_id" value={f.addressee_id} />
                  <button type="submit" className="ghost">Cancel</button>
                </form>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
