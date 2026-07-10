import { createClient } from '@/lib/supabase/server';
import { updateProfile } from '@/app/actions/settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? '';

  return (
    <div>
      <h1>Settings</h1>
      <p className="subtitle">Manage your profile and account.</p>

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

          <button className="mt" type="submit">Save changes</button>
        </form>
      </div>
    </div>
  );
}
