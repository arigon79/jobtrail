'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Slim top progress bar for App Router navigations. Server-rendered pages show
 * no feedback while they load; this starts a bar on internal link clicks (and
 * back/forward) and completes it once the new route commits.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTrickle() {
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
  }

  // Start on internal navigation intent.
  useEffect(() => {
    function start() {
      setVisible(true);
      setWidth(8);
      stopTrickle();
      // Creep toward 90% while the server renders, but never reach 100.
      trickle.current = setInterval(() => {
        setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w));
      }, 200);
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      stopTrickle();
    };
  }, []);

  // Complete when the route (path or query) actually changes.
  useEffect(() => {
    stopTrickle();
    setWidth(100);
    const hide = setTimeout(() => setVisible(false), 220);
    const reset = setTimeout(() => setWidth(0), 450);
    return () => {
      clearTimeout(hide);
      clearTimeout(reset);
    };
  }, [pathname, searchParams]);

  return (
    <div
      className="nav-progress"
      role="presentation"
      style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
    />
  );
}
