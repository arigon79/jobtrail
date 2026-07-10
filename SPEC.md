# Job Application Tracker — v1 Spec

## Context

A personal, single-owner web app to track job applications end to end: companies targeted, jobs applied to or still to apply to, notes and links, uploaded resumes (one per company), interview rounds, and referral outreach (people asked, their LinkedIn, and where each ask stands). Built because the owner is actively job hunting now and needs one place to see status at a glance instead of scattered spreadsheets and browser tabs.

Solo user, deployed publicly on Vercel, so it needs auth to protect the data — but there is only ever one real user.

## Tech Stack

- **Frontend + backend:** Next.js (App Router) — UI pages plus API routes / server actions. No separate Express server.
- **Database:** Supabase Postgres.
- **Auth:** Supabase Auth (email magic-link or Google OAuth). Single user.
- **File storage:** Supabase Storage bucket for resume PDFs.
- **Hosting:** Vercel (single deploy).
- **Data access:** Supabase JS client (`@supabase/ssr` for server components + route handlers). Row Level Security on every table keyed to `auth.uid()`.

## Data Model

All tables carry `user_id uuid references auth.users` and have RLS enabled so a row is only visible/writable when `user_id = auth.uid()`. Timestamps default to `now()`.

Create order (FK dependencies): companies → resumes → jobs → interviews → contacts → referrals.

```sql
-- companies: a company you're targeting or applied to
create table companies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  website    text,
  notes      text,
  created_at timestamptz not null default now()
);

-- resumes: uploaded PDF, at most one per company (company_id null = general)
create table resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  label        text not null,
  storage_path text not null,                 -- path in Supabase storage bucket
  is_default   boolean not null default false,
  uploaded_at  timestamptz not null default now()
);
-- one resume per company (nulls allowed to repeat = multiple general resumes)
create unique index resumes_one_per_company
  on resumes(user_id, company_id) where company_id is not null;

-- jobs: one application (either to-apply or already applied)
create table jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  company_id     uuid references companies(id) on delete set null,
  role           text not null,
  job_link       text,
  location       text,
  remote         boolean not null default false,
  salary_range   text,                          -- posting's advertised range
  status         text not null default 'to_apply',
                   -- to_apply | applied | oa | phone_screen | interview
                   -- | final | offer | accepted | rejected | withdrawn | ghosted
  priority       text not null default 'med',   -- low | med | high
  deadline       date,                          -- target apply-by date
  applied_at     date,                          -- null until applied
  follow_up_at   date,                          -- reminder to chase
  offer_amount   numeric,                       -- actual comp if offered
  offer_currency text default 'USD',
  resume_id      uuid references resumes(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- interviews: one row per interview round for a job (many per job)
create table interviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  round        text,                            -- e.g. "Round 1", "Onsite", "Final"
  kind         text,                            -- phone | technical | behavioral | onsite | other
  scheduled_at timestamptz,
  outcome      text,                            -- pending | passed | failed | cancelled
  notes        text,
  created_at   timestamptz not null default now()
);

-- contacts: a person you asked / could ask for a referral (always tied to a company)
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid not null references companies(id) on delete cascade,  -- their employer
  name         text not null,
  linkedin_url text,
  role         text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- referrals: a specific ask, linking a contact to a job
create table referrals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  job_id     uuid references jobs(id) on delete set null,
  status     text not null default 'to_ask',
               -- to_ask | asked | agreed | referred | declined | no_response
  asked_at   date,
  notes      text,
  created_at timestamptz not null default now()
);
```

### Status enums

| Enum | Values |
|------|--------|
| `jobs.status` | `to_apply, applied, oa, phone_screen, interview, final, offer, accepted, rejected, withdrawn, ghosted` |
| `jobs.priority` | `low, med, high` |
| `interviews.kind` | `phone, technical, behavioral, onsite, other` |
| `interviews.outcome` | `pending, passed, failed, cancelled` |
| `referrals.status` | `to_ask, asked, agreed, referred, declined, no_response` |

Enums enforced in app code (TypeScript union) + a Postgres `check` constraint per column.

## Storage

- Bucket: `resumes` (private).
- Path convention: `{user_id}/{company_id or 'general'}/{resume_id}.pdf`.
- Upload via signed URL from a server action; download via short-lived signed URL.
- Accept `application/pdf` only, max ~10 MB.

## Auth

- Supabase Auth. One provider is enough — magic-link email (simplest) or Google OAuth.
- Middleware protects every route except the login page; unauthenticated users redirect to `/login`.
- RLS is the real security boundary; middleware is UX.

## API / Server Actions

Server actions (or route handlers under `app/api/`) per entity, all scoped to `auth.uid()`:

| Action | Entity | Notes |
|--------|--------|-------|
| create / update / delete / list | companies | list feeds pickers |
| create / update / delete / list | jobs | list supports filter by status, company, priority |
| create / update / delete / list | interviews | nested under a job |
| upload / replace / delete / list | resumes | upload writes storage + row; replace enforces one-per-company |
| create / update / delete / list | contacts | |
| create / update / delete / list | referrals | grouped by job and by contact |
| dashboard summary | jobs | counts per status, upcoming deadlines, pending follow-ups, upcoming interviews |

## UI / Pages

| Route | Purpose |
|-------|---------|
| `/login` | Supabase Auth sign-in |
| `/` (dashboard) | Status board: job counts per status, upcoming deadlines, follow-ups due, upcoming interviews, quick-add |
| `/jobs` | Table/board of all jobs, filter by status / company / priority, inline status change |
| `/jobs/[id]` | Job detail: all fields, linked resume, interview rounds, linked referrals, notes |
| `/companies` | List of companies + their resume + related jobs/contacts |
| `/companies/[id]` | Company detail: info, the one resume, jobs at this company, contacts |
| `/resumes` | All uploaded resumes, upload/replace, download |
| `/contacts` | People list, LinkedIn links, filter by company |
| `/referrals` | Referral pipeline grouped by status |

Dashboard is the landing page and the "good dashboard" ask: at-a-glance status counts, what needs applying (deadline soon), what needs chasing (follow-up due), upcoming interviews, referral asks outstanding.

## Acceptance Criteria

1. A logged-in user can create a company with name (required), website, notes; it appears in `/companies`.
2. A user can create a job with role (required) and a company, set status, priority, deadline, links, notes; it appears in `/jobs`.
3. `/jobs` filters correctly by status, by company, and by priority (independently and combined).
4. Changing a job's status on `/jobs` persists and reflects on the dashboard counts.
5. A user can add one or more interview rounds to a job (round, kind, scheduled_at, outcome, notes); they show on the job detail and upcoming ones show on the dashboard.
6. A user can record an offer amount + currency on a job when status reaches `offer`/`accepted`.
7. A user can upload one PDF resume per company; uploading a second for the same company replaces the first (enforced by unique index, surfaced as replace in UI, no orphaned storage object).
8. A user can add a contact tied to a company, with name (required) and LinkedIn URL; the LinkedIn URL opens the profile in a new tab.
9. A user can create a referral linking a contact to a job, set its status, and see it in the referral pipeline grouped by status.
10. Dashboard shows: count of jobs per status, jobs with a deadline in the next 7 days, jobs with a follow-up due today or earlier, interviews scheduled in the next 7 days, and count of outstanding referral asks (`to_ask`/`asked`).
11. RLS verified: a second auth user sees zero rows from the first user's data across all tables.
12. Unauthenticated request to any route except `/login` redirects to `/login`.
13. Resume download uses a signed URL that is not publicly guessable.
14. Tests written and passing; no degradation of existing functionality.

## Testing Plan

| Layer | What | Count |
|-------|------|-------|
| Unit | status/priority/outcome enum validation; dashboard aggregation (counts, deadline window, follow-up due, upcoming interviews); one-resume-per-company logic | +7 |
| Integration | job CRUD with filters; interview rounds CRUD under a job; resume upload → replace → confirm single storage object; referral create + status change; RLS isolation between two users | +6 |
| E2E | login → add company → add job → add interview → upload resume → add contact → create referral → see all on dashboard | +1 |

## Effort Estimate

| Component | Est |
|-----------|-----|
| Supabase project, schema, RLS policies, storage bucket | 3h |
| Auth + middleware + `@supabase/ssr` wiring | 2h |
| Companies + jobs CRUD + `/jobs` filters | 5h |
| Interview rounds CRUD + job detail | 2h |
| Resumes upload/replace/download to storage | 3h |
| Contacts + referrals CRUD + pipeline view | 4h |
| Dashboard (aggregation + UI) | 4h |
| Tests (unit + integration + E2E) | 5h |
| **Total** | **~28h** |

## Files Reference (target structure)

| File | Purpose |
|------|---------|
| `supabase/migrations/0001_init.sql` | Tables, indexes, check constraints, RLS policies |
| `lib/supabase/server.ts` / `client.ts` | Supabase clients (`@supabase/ssr`) |
| `middleware.ts` | Auth redirect |
| `app/login/page.tsx` | Sign-in |
| `app/page.tsx` | Dashboard |
| `app/jobs/page.tsx`, `app/jobs/[id]/page.tsx` | Jobs list + detail (with interviews) |
| `app/companies/…`, `app/contacts/…`, `app/referrals/…`, `app/resumes/…` | Entity pages |
| `app/actions/*.ts` | Server actions per entity |
| `lib/types.ts` | TS enums + row types |
| `tests/…` | Unit / integration / E2E |

## Out of Scope (v1)

- Email integration / notifications by email
- Browser extension
- Auto-scraping job postings from URLs
- Calendar / Google Calendar sync
- Multi-user / team features (single owner only)

## Rollback Plan

- App is stateless on Vercel — roll back by reverting the deploy.
- Schema changes ship as numbered SQL migrations; each has a paired down-migration (`drop` statements) to reverse. Data loss on rollback is acceptable for a personal app but back up via Supabase dashboard export before destructive migrations.
