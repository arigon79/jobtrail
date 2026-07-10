# JobTrail

Personal, single-user app to track job applications, resumes, interviews, contacts, and referrals. Next.js (App Router) + Supabase (Postgres + Auth + Storage), deployed on Vercel.

See [SPEC.md](./SPEC.md) for the full feature spec and data model.

## What's built

- Full database schema, RLS, and storage bucket — `supabase/migrations/0001_init.sql`
- Supabase Auth (magic link) + route protection middleware
- Dashboard with live aggregations (status counts, deadlines, follow-ups, interviews, referral asks)
- Jobs: list + filter (status/company/priority), inline status change, create, delete, detail page
- Interview rounds: add/list/delete on the job detail page
- Companies: full CRUD
- Contacts: full CRUD, tied to a company, with LinkedIn links
- Referrals: pipeline grouped by status (to_ask → referred), links a contact to a job
- Resumes: PDF upload/replace (one per company) and download via short-lived signed URL

Design system in `app/globals.css`: dark theme, color-coded status badges (with text
labels, never color alone), keyboard focus rings, responsive nav/tables, empty states.

## Setup

1. **Create a Supabase project** at https://supabase.com.

2. **Run the migration.** In the Supabase dashboard → SQL Editor, paste and run
   `supabase/migrations/0001_init.sql`. (Or use the Supabase CLI: `supabase db push`.)

3. **Configure env.** Copy `.env.local.example` to `.env.local` and fill in from
   Supabase → Project Settings → API:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Enable email auth.** Supabase → Authentication → Providers → Email (magic
   link is on by default). For local testing, magic links appear in Supabase →
   Authentication → Logs, or set up SMTP.

5. **Install + run:**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000, sign in with your email, click the magic link.

## Deploy (Vercel)

- Import the repo in Vercel.
- Add the three `NEXT_PUBLIC_*` env vars (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL).
- In Supabase → Authentication → URL Configuration, add your Vercel URL to
  **Redirect URLs** (e.g. `https://your-app.vercel.app/auth/confirm`).
