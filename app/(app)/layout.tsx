import { signOut } from '@/app/actions/auth';
import { NavLink } from '@/components/nav-link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="nav" aria-label="Primary">
        <span className="brand">Job Tracker</span>
        <NavLink href="/">Dashboard</NavLink>
        <NavLink href="/jobs">Jobs</NavLink>
        <NavLink href="/companies">Companies</NavLink>
        <NavLink href="/contacts">Contacts</NavLink>
        <NavLink href="/referrals">Referrals</NavLink>
        <NavLink href="/resumes">Resumes</NavLink>
        <span className="spacer" />
        <form action={signOut}>
          <button className="secondary sm" type="submit">Sign out</button>
        </form>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
