import { createClient } from '@/lib/supabase/server';
import { updateProfile, changePassword, upsertProfile } from '@/app/actions/profile';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id ?? '')
    .maybeSingle();
  const profile = profileRow as Profile | null;

  const fullName = ((user?.user_metadata?.full_name as string | undefined) ?? '').trim();
  const initial = (fullName[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <div>
      <h1>Profile</h1>
      <p className="subtitle">Your name and account security.</p>

      <div className="profile-head">
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
        <div>
          <div className="profile-name">{fullName || 'No name set'}</div>
          <div className="muted">{user?.email}</div>
        </div>
      </div>

      <h2>Name</h2>
      <div className="panel" style={{ maxWidth: 480 }}>
        <form action={updateProfile}>
          <label htmlFor="full_name">Name</label>
          <input
            id="full_name"
            name="full_name"
            defaultValue={fullName}
            placeholder="Your name"
            autoComplete="name"
            maxLength={80}
          />

          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={user?.email ?? ''} disabled readOnly />
          <p className="sheet-hint">Email is tied to your login and can’t be changed here.</p>

          <button className="mt" type="submit">Save name</button>
        </form>
      </div>

      <h2>Public profile</h2>
      <div className="panel" style={{ maxWidth: 480 }}>
        <p className="sheet-hint" style={{ marginTop: 0 }}>
          Friends find you by <strong>@handle</strong>. This is the only info friends can see —
          your job tracker stays private.
        </p>
        <form action={upsertProfile}>
          <label htmlFor="handle">Handle</label>
          <input
            id="handle"
            name="handle"
            defaultValue={profile?.handle ?? ''}
            placeholder="jane_doe"
            pattern="@?[A-Za-z0-9_]{3,30}"
            required
          />

          <label htmlFor="display_name">Display name</label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={profile?.display_name ?? fullName}
            placeholder="Jane Doe"
            maxLength={80}
            required
          />

          <label htmlFor="headline">Headline</label>
          <input
            id="headline"
            name="headline"
            defaultValue={profile?.headline ?? ''}
            placeholder="New grad SWE, open to work"
            maxLength={120}
          />

          <label htmlFor="current_company">Current company</label>
          <input
            id="current_company"
            name="current_company"
            defaultValue={profile?.current_company ?? ''}
            placeholder="Where you work now (powers referral hints)"
            maxLength={80}
          />

          <label className="check-row">
            <input type="checkbox" name="open_to_work" defaultChecked={profile?.open_to_work ?? false} />
            <span>Show I’m open to work</span>
          </label>
          <label className="check-row">
            <input type="checkbox" name="share_default" defaultChecked={profile?.share_default ?? false} />
            <span>Pre-check “share to feed” on new updates</span>
          </label>

          <button className="mt" type="submit">Save public profile</button>
        </form>
      </div>

      <h2>Change password</h2>
      <div className="panel" style={{ maxWidth: 480 }}>
        <form action={changePassword}>
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" />

          <label htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />

          <button className="mt" type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
}
