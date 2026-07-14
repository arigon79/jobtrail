import { signOut } from '@/app/actions/auth';
import { NavLink } from '@/components/nav-link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="nav" aria-label="Primary">
        <span className="brand">Job Tracker</span>
        <div className="nav-links">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/jobs">Jobs</NavLink>
          <NavLink href="/companies">Companies</NavLink>
          <NavLink href="/contacts">Contacts</NavLink>
          <NavLink href="/referrals">Referrals</NavLink>
          <NavLink href="/resumes">Resumes</NavLink>
        </div>
        <span className="spacer" />
        <form action={signOut} className="nav-actions">
          <button className="secondary sm" type="submit">Sign out</button>
        </form>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
