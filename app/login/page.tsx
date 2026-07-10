'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <h1>Job Application Tracker</h1>
      <p className="subtitle">Sign in with a magic link.</p>
      <div className="panel">
        {sent ? (
          <p className="ok">Check your email for the sign-in link.</p>
        ) : (
          <form onSubmit={sendLink}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button className="mt" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            {error && <p className="err">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
