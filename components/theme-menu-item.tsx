'use client';

/**
 * Theme toggle rendered as a dropdown menu row. Same flip-the-attribute logic
 * as ThemeToggle; icon + label swap via CSS off <html data-theme> so there is
 * no hydration mismatch. Closes the enclosing <details> menu after toggling.
 */
export function ThemeMenuItem() {
  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const current =
      root.getAttribute('data-theme') ??
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    e.currentTarget.closest('details')?.removeAttribute('open');
  }

  return (
    <button type="button" onClick={toggle} className="menu-item theme-menu-item" role="menuitem">
      {/* sun + "Light mode" show in dark theme; moon + "Dark mode" in light theme */}
      <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <span className="lbl-light">Light mode</span>
      <span className="lbl-dark">Dark mode</span>
    </button>
  );
}
