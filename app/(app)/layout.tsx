import Link from 'next/link';
import { Suspense } from 'react';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { NavLink } from '@/components/nav-link';
import { ThemeMenuItem } from '@/components/theme-menu-item';
import { NavProgress } from '@/components/nav-progress';
import { Toast } from '@/components/toast';

const ico = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const NAV = [
  { href: '/', label: 'Dashboard', icon: ico(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>) },
  { href: '/jobs', label: 'Tracker', icon: ico(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></>) },
  { href: '/applications', label: 'Jobs', icon: ico(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" /></>) },
  { href: '/companies', label: 'Companies', icon: ico(<><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18" /><path d="M8 8h.01M8 12h.01M8 16h.01M11 8h.01M11 12h.01M11 16h.01" /></>) },
  { href: '/calendar', label: 'Calendar', icon: ico(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>) },
  { href: '/notes', label: 'Kanban', icon: ico(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18" /></>) },
  { href: '/feed', label: 'Feed', icon: ico(<><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></>) },
  { href: '/friends', label: 'Friends', icon: ico(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>) },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() ?? '';
  const initial = (fullName[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <div className="app-shell">
      <Suspense fallback={null}>
        <NavProgress />
        <Toast />
      </Suspense>

      <header className="topbar">
        <Link href="/" className="brand" aria-label="JobTrail home">
          <span className="brand-name">JobTrail</span>
        </Link>
        <span className="topbar-spacer" />
        <div className="topbar-actions">
          <button className="icon-btn topbar-bell" type="button" aria-label="Notifications" title="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          <details className="profile-menu">
            <summary className="avatar-btn" aria-label="Profile menu" title={fullName || user?.email || 'Profile'}>
              {initial}
            </summary>
            <div className="menu-pop" role="menu">
              <Link href="/profile" className="menu-item" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Profile</span>
              </Link>
              <ThemeMenuItem />
            </div>
          </details>
        </div>
      </header>

      <div className="app-body">
      <nav className="sidebar" aria-label="Primary">
        <div className="nav-links">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href}>
              <span className="nav-ico" aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>
        <span className="spacer" />
        <div className="sidebar-foot">
          <form action={signOut}>
            <button className="signout-btn" type="submit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </nav>
      <main className="container">{children}</main>
      </div>
    </div>
  );
}
