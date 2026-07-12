# Project: JobTrail

Personal, single-user job-application tracker. Companies, jobs, interviews, contacts,
referrals, per-job attachments, sticky notes (kanban), dashboard. Deployed on Vercel.
Full product intent in [SPEC.md](SPEC.md) — but see **Drift** below: shipped code has
moved past the spec.

## Tech Stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript 5 (strict)
- Supabase Postgres + Auth + Storage, via `@supabase/ssr`
- No Tailwind, no component lib — plain CSS (`app/globals.css`) + inline styles
- RLS on every table keyed to `auth.uid()`; single real user

## Commands

- Dev: `npm run dev` (Turbopack)
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- No test runner wired yet despite SPEC's testing plan — ask before assuming `npm test`.

## Structure

- `app/(app)/*` — authed pages (dashboard `/`, jobs, companies, contacts, referrals,
  resumes, attachments, calendar, notes, profile, applications). Route group `(app)`.
- `app/actions/*.ts` — one server-actions file per entity. All mutations live here.
- `app/login`, `app/auth/confirm/route.ts` — auth flow.
- `lib/supabase/{server,client,middleware}.ts` — Supabase clients.
- `lib/types.ts` — enums (`as const` unions) + row interfaces. **Single source of truth
  for enums; keep in sync with the SQL migration.**
- `components/*` — shared client components.
- Path alias: `@/*` → repo root.

## Conventions (follow existing code)

- **Server actions**: `'use server'` at top. Each action takes `FormData`, not typed args.
- Auth gate: every action calls the local `uid()` helper → `{ supabase, userId }`, throws
  `'Not authenticated'` if no user. Re-declare `uid()` per actions file (not shared).
- Form-field helper `str(fd, key)` → trimmed string or `null`. Reuse the pattern.
- Validate enum values against the `lib/types.ts` union before insert/update
  (`if (!JOB_STATUSES.includes(status)) throw ...`).
- After mutation: `revalidatePath(...)` every affected route, then `redirect(...)` with a
  toast via `?toast=<encoded msg>` query param.
- Errors: `throw new Error(error.message)` on Supabase errors. No custom error class.
- Named exports only. Functional components. TypeScript `interface` for row shapes.
- Booleans from checkboxes: `fd.get('x') === 'on'`. Pin toggles: `pinned === 'true'`.

## Data model quick ref

Create order (FK): companies → resumes → jobs → interviews → contacts → referrals.
Enums: `JobStatus`, `Priority`, `InterviewKind`, `InterviewOutcome`, `ReferralStatus`,
`NoteColor`, `KanbanStatus`, `AttachmentKind` — all in `lib/types.ts`.

## Drift from SPEC (real code ≠ spec — trust the code)

- Rows gained `pinned` (companies, jobs, notes) + pin toggle actions.
- `jobs` gained `posted_at`; company on a job can be resolved by typed name
  (`resolveCompanyId` auto-creates the company).
- Added: sticky **notes** with kanban columns (`todo/doing/done`), per-**job**
  `attachments` (resume/cv/cover_letter/other) — separate from the spec's one-resume-
  per-company `resumes`. Profile page, calendar page, theme toggle, navbar.
- **v2 social layer** (migrations 0005/0006, applied): `profiles`, `friendships`,
  `feed_events`, `reactions`, `comments`. Friends see each other's shared activity.
  Design + rationale in [docs/specs/social-data-model.md](docs/specs/social-data-model.md),
  concept in [docs/ideas/social-job-hunt.md](docs/ideas/social-job-hunt.md). Pages:
  `/feed`, `/friends`; actions in `app/actions/social.ts`. Cross-user reads go through
  `security definer` helpers (`are_friends` accepted-only, `are_linked` any status) —
  never let friends read the private `jobs`/`interviews` tables directly.
- SPEC.md still describes v1; use it for intent/RLS/storage rules, not exact schema.

## Boundaries

- Never commit `.env*` or Supabase keys.
- RLS is the security boundary — don't rely on middleware for data protection. Every new
  table needs `user_id` + RLS keyed to `auth.uid()`.
- Schema changes ship as numbered SQL migrations (`supabase/migrations/NNNN_*.sql`); mirror
  any enum/column change in `lib/types.ts`. Ask before destructive migrations.
  Note: v1 migration numbers collide (two `0002_*`, two `0003_*`); v2 social layer is
  cleanly numbered `0005`/`0006`. Next new migration = `0007_*`.
  Gotcha: LANGUAGE SQL function bodies are validated at creation — define tables
  BEFORE any `security definer` helper that references them, or the migration fails.
- Storage: `resumes`/attachments buckets are private; download via short-lived signed URL,
  never a public path.
