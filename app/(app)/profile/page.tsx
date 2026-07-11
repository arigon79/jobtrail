import { createClient } from '@/lib/supabase/server';
import { updateProfile, changePassword } from '@/app/actions/profile';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

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
