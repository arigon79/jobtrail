import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobTrail',
  description: 'Track every job application, interview, and referral.',
};

// Runs before first paint to set the theme, so there is no flash of the wrong
// mode. Reads a saved choice, else falls back to the OS preference.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
