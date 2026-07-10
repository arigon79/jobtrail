'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Transient success sign. Server actions redirect with `?toast=<message>`; this
 * shows it briefly, then strips the param so a refresh won't re-fire it.
 */
export function Toast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [text, setText] = useState<string | null>(null);

  // Capture the message and clean the URL.
  useEffect(() => {
    const msg = params.get('toast');
    if (!msg) return;
    setText(msg);
    const next = new URLSearchParams(Array.from(params.entries()));
    next.delete('toast');
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }, [params, pathname, router]);

  // Auto-dismiss.
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), 3000);
    return () => clearTimeout(t);
  }, [text]);

  if (!text) return null;
  return (
    <div className="toast" role="status" aria-live="polite" onClick={() => setText(null)}>
      <span className="toast-check" aria-hidden="true">✓</span>
      {text}
    </div>
  );
}
