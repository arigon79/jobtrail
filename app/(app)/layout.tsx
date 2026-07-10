import Link from 'next/link';
import { Suspense } from 'react';
import { signOut } from '@/app/actions/auth';
import { NavLink } from '@/components/nav-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavProgress } from '@/components/nav-progress';
import { Toast } from '@/components/toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Suspense fallback={null}>
        <NavProgress />
        <Toast />
      </Suspense>
      <nav className="sidebar" aria-label="Primary">
        <Link href="/" className="brand" aria-label="JobTrail home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M10 7V5h4v2" />
              <path d="M2 13h20" />
            </svg>
          </span>
          <span className="brand-name">JobTrail</span>
        </Link>
        <div className="nav-links">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/jobs">Tracker</NavLink>
          <NavLink href="/applications">Jobs</NavLink>
          <NavLink href="/companies">Companies</NavLink>
          <NavLink href="/calendar">Calendar</NavLink>
          <NavLink href="/notes">Notes</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </div>
        <span className="spacer" />
        <div className="sidebar-foot">
          <ThemeToggle />
          <form action={signOut}>
            <button className="secondary sm" type="submit">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="container">{children}</main>
    </div>
  );
}
