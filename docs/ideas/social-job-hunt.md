# Social Job Hunt (JobTrail v2)

## Problem Statement
How might we turn solo job-hunting from an isolated grind into something you do *with your friends* — seeing what they're applying to, cheering offers, and unlocking referrals?

## Recommended Direction
Build the **Friends' Activity Feed**, not public Reddit communities. Keep the private tracker as the base; add a friend graph and an opt-in shared feed on top. A "community" is a small closed squad of real friends — it's alive at 5 members, where public communities would be a ghost town for a solo dev with no seeding budget. This matches all four answers: friend group, see-friends-activity, willing to rework the data model, solo/spare-time. Public communities stay parked as a possible v3 — only worth it if the friend layer proves people share at all.

## Key Assumptions to Validate
- [ ] Friends will share the hard stuff (rejections, ghostings), not just wins — test with 5 real friends, manually, before building.
- [ ] A mutual-friends-only feed has enough activity to feel alive — count how many events/week the circle actually generates.
- [ ] "Works at X → referral hint" is the feature that makes it a painkiller — ask friends if they'd act on it.

## MVP Scope
**In:** friendships table (mutual accept) · per-event opt-in sharing (`is_shared` on jobs/interviews) · one reverse-chron home feed of friends' shared events · reactions (👏) + comments · profile showing "works at / open to work."

**Out (MVP):** public communities, voting, threads, notifications beyond in-app, referral marketplace mechanics, DMs.

## Not Doing (and Why)
- **Public communities / Reddit threads** — cold-start death for a solo dev; no moderation capacity; you'd be a worse Blind.
- **Leaderboards / offer counts** — job hunting is anxious; competitive framing hurts the core users.
- **Follower (asymmetric) graph** — mutual-friends only keeps it trust-based and privacy-simple for v1.
- **Real-time / websockets** — page-load feed is enough; Supabase realtime is a later nicety.

## Open Questions
- Sharing granularity: per-event toggle, or "close friends" tiers, or a global on/off? (Affects RLS design.)
- Does the private tracker stay fully private by default, with sharing strictly opt-in per row? (Recommend yes.)
- Friend discovery: invite-link only, or search by email? (Invite-link is simpler + safer for v1.)

## Context
Pivot from JobTrail v1 — a deliberately single-user tracker (RLS keyed to `auth.uid()`, every row private). The hard engineering cost is reworking RLS so friends can read *shared* rows: a `friendships` table, per-event visibility flags, new read policies. That rework — not the feed UI — is the real work. See [SPEC.md](../../SPEC.md) and [CLAUDE.md](../../CLAUDE.md).
