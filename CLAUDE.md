# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The Next.js scaffold, **M0 (auth foundations)**, and **M1 (generation + calibration)** are in place:

- **M0:** signup gate (`/signup`) with women attestation + versioned consent → `profiles` write + phone OTP, OTP verify (`/verify`), login (`/login`), protected post-auth landing (`/skills`, still an M2 stub).
- **M1:** admin calibration desk (`/admin`, gated by `profiles.is_admin`). Generates a skill's scaffold + naira bands + a draft question pool via Anthropic (server-side, into `questions` as `draft`); review page (`/admin/skills/[id]`) to approve/retire/edit questions, edit bands, and set the skill `live` (gated on ≥3 approved questions per level).

- **M2:** skill pick (`/skills`, live skills only) → timed play (`/play/[skillId]`, scored or `?mode=practice`). Server serves a random approved 3-question subset **without `correct_index`**, enforces the timer server-side (idempotent serve — refresh can't reset the clock or re-roll), grades on the server, computes reached level/score/tier/band, and finalizes the attempt. One scored run per skill per week (unique constraint + completed-attempt guard); practice is unscored and persists nothing. Reveal shows band/tier + climb.

- **M3:** funnel. From the reveal, accept (records a `routings` row; Tier A flagged for CRM/ERP sync via `synced_to_crm=false`) or dispute. Dispute = re-prove live (`beginReprove` re-opens the attempt at level reached+1; clearing it upgrades the band) or human review (`disputes` row). L1/L2 reveal shows the community CTA → `community_joins`. Admin dispute desk at `/admin/disputes` (assign + resolve). Funnel actions in `app/play/funnel-actions.ts`.

- **M4:** leaderboard + raffle. On accept, `acceptResult` posts a display-safe `leaderboard_entries` row (no PII beyond first name + last initial) and, for Tier A, enters the weekly raffle via `lib/raffu.ts` + mirrors `raffle_entries`. `/leaderboard` is per-category and **live** (client polls a server action every 10s while the tab is visible). `/raffle` shows the pot + winners spotlight; admin draw at `/admin/raffle` picks top scorer + one random from the qualified pool into `raffle_winners`. Shareable score card at `/card/[attemptId]` (public, server-side read of display-safe fields) with a `?ref=` referral that grants the referrer a bonus entry on a referred user's first Tier-A accept.

- **M5:** comms, analytics, hardening. Anonymous safeguarding report (`/safeguarding`, public/no-auth, server-side write) + admin review (`/admin/safeguarding`). Admin funnel dashboard (`/admin/dashboard`, Recharts) over the §15 metrics. Email via `lib/email.ts` (Resend HTTP API, no-op if unset) wired into community-join welcome. In-memory rate limiter (`lib/rate-limit.ts`) on OTP resend + safeguarding submit. Shared `SiteFooter` with the safeguarding link + Mastercard Foundation acknowledgment (body copy, never abbreviated). A11y: reduced-motion (global), `aria-live` timer, `aria-pressed` answer options, focus-visible rings.

**All §16 milestones (M0–M5) are implemented.** Remaining for launch are operational, not code: a Neon project + Netlify env, Twilio Verify, Resend, raffu provisioning, and the deferred downstream integrations below (see the `launch-blocker` GitHub issues).

Known stubs / not-yet-wired (intentional): CRM/ERP sync leaves `synced_to_crm=false` (no sync worker); workshop enrollment on community join (downstream, community-team owned); raffu entry is live (cross-project insert) but depends on the weekly raffle being provisioned in raffu's dashboard; `lib/rate-limit.ts` is per-instance (back with Redis for hard limits across instances); email/SMS require Resend/Twilio keys.

**raffu coupling (§19 — RESOLVED):** cross-project direct insert with raffu's **anon key**, in `lib/raffu.ts`. Grounded in the real raffu source (`/Users/josephagunbiade/Desktop/studio/raffu`): its `entries` table is `(raffle_id, first_name, last_name)` only, keyed by `raffle_id` (looked up from `raffles.slug`), and RLS allows a public/anon insert while `raffles.status='collecting'` — there is no REST API. `enterRaffle()` points a Supabase client at raffu's OWN project (`RAFFU_SUPABASE_URL`/`RAFFU_SUPABASE_ANON_KEY`), resolves the weekly slug → raffle id → inserts the name; the rich data (skill/band/score) stays in skillsworth's local `raffle_entries` mirror (the record of truth). Unset env = safe no-op. **A shared Supabase project is NOT viable** — both apps define `public.profiles` with conflicting schemas + an `on_auth_user_created` trigger that collide. Operational dependency: the weekly raffle must exist in raffu, set to `collecting`, with the slug `raffleSlug(week_iso)` returns — `skill-worth-<lowercased ISO week>`, e.g. `skill-worth-2026-w24` (lowercased because raffu's slug rule forbids uppercase; `isoWeek()` yields `2026-W24`). Provision it with `scripts/ensure-weekly-raffle.mjs` (idempotent). Locally: `node --env-file=.env.local scripts/ensure-weekly-raffle.mjs`. In CI it runs weekly via `.github/workflows/weekly-raffle.yml` (Mon 07:00 UTC), which reads the three values from GitHub Actions repo secrets (`RAFFU_SUPABASE_URL`, `RAFFU_SERVICE_ROLE_KEY`, `RAFFU_OWNER_ID`). That script is **ops-only**: it uses raffu's service-role key + `RAFFU_OWNER_ID` (the TTS admin's raffu user id) because creating a raffle needs owner RLS; the running app still only uses raffu's anon key. It brands the raffle TTS deep-green/brand-green and sets `winner_count=2` (top + random, §11).

Reference docs:

- `PROVE_YOUR_WORTH_CLAUDE_CODE_HANDOFF.md` — the **authoritative spec** (v1.0, locked). Source of truth for *what* and *why*. Read the relevant section before writing code in any area.
- `prove-your-worth.jsx` — a single-file React **reference prototype**. Source of truth for *interaction, screen flow, copy, brand, and motion* — but it contains demo shortcuts that **must not ship** (see below). It is excluded from tsconfig; treat it as reference, not compiled code.

When the spec marks a decision as open (handoff §19), surface it — do not guess.

## Commands

`npm run dev -- -p 3001` (local; **not** 3000 — something on the dev machine probes `localhost:3000/health` and shuts down whatever answers it) · `npm run build` · `npm run typecheck` (tsc --noEmit) · `npm run lint` · `npm run db:generate` (SQL migration from `lib/db/schema.ts` → `drizzle/`) · `npm run db:migrate` (apply to `DATABASE_URL_UNPOOLED` or `DATABASE_URL`) · `npm run db:studio`. Copy `.env.example` → `.env.local` and fill in before running.

## Stack: Neon Postgres + Drizzle + Better Auth (no Supabase)

Migrated off Supabase in Nov 2026 (issue #8) — the Supabase project was shut down and production moved to **Neon (paid tier)**. raffu still runs on its own Supabase; that's the only `@supabase/supabase-js` use left (`lib/raffu.ts`, `scripts/ensure-weekly-raffle.mjs`).

- **There is no RLS and no browser DB access.** `lib/db` is `server-only`; every query runs in a Server Component/Action after `currentVerifiedUser()` / `currentUser()` / `requireAdmin()` and filters by the caller's id. Ownership checks (`ownedAttempt` / `ownsAttempt`) replace what RLS policies did — **any new query on user data must filter by `user.id` explicitly.**
- **Schema** lives in `lib/db/schema.ts` (TS keys = snake_case column names, timestamps as strings, so rows look like the old supabase-js results). Change the schema, then `npm run db:generate` and commit the SQL in `drizzle/`.
- **Race safety is in constraints:** unique `(user_id, skill_id, week_iso)` on attempts, unique `(attempt_id, level)` on attempt_levels (idempotent serve), unique `routings.attempt_id` (raffle side-effects once), and grading updates only `WHERE graded_at IS NULL` (single-shot submit).
- **Auth = Better Auth** (`lib/auth.ts`): email+password, uuid ids, sessions in Neon, cookies set from Server Actions via `nextCookies()`. **There's deliberately no `/api/auth` route handler** — signup must go through `app/signup/actions.ts` so the attestation/consent/profile gate can't be bypassed.
- **Phone OTP = Twilio Verify REST** (`lib/otp.ts`), a profile attribute (`phone_verified`), not an auth method. Without Twilio creds: under `next dev` the code **`123456`** verifies any number; under `next start`/production it refuses (signup shows "couldn't send a code"). Twilio gotchas: enable **Nigeria** under Messaging → Geo Permissions; use a paid account.
- **Route params** are checked with `isUuid()` (`lib/ids.ts`) before querying — Postgres errors on malformed uuids where supabase-js returned null.

### Local dev

Any Postgres works. Set `DATABASE_URL` (e.g. a Neon dev branch, or `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3001`, then `npm run db:migrate` and `npm run dev -- -p 3001`. Leave `RAFFU_*` and `TWILIO_*` unset. Grant yourself the calibration desk after signing up:

```sql
update profiles set is_admin = true
where id = (select id from "user" where email = '<you>@example.com');
```

### Production (Netlify + Neon)

Hosted on **Netlify** at https://skillsworth.netlify.app (`netlify.toml`, Node 22). Netlify env: `DATABASE_URL` (Neon **pooled** string), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` + `NEXT_PUBLIC_APP_URL` (= the site origin), `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RAFFU_SUPABASE_URL` / `RAFFU_SUPABASE_ANON_KEY`. Run migrations from a machine with `DATABASE_URL_UNPOOLED` set: `npm run db:migrate`.

## Layout

- `app/` — App Router pages: `page.tsx` (hook), `signup/`, `verify/`, `login/`, `skills/` — each with co-located `actions.ts` server actions for auth. `globals.css` holds the TTS token CSS vars + font imports + reduced-motion rule.
- `components/ui.tsx` — shared TTS-brand primitives (AppShell, Field, Button, Card, Eyebrow…). Reuse these rather than re-inlining prototype styles.
- `lib/account.ts` — `CONSENT_VERSION` (bump on consent copy change) + `normalizePhoneNG` (→ E.164).
- `lib/generation.ts` — `server-only` Anthropic generation (`generateScaffold`, `generateQuestions`) with strict JSON validation; returns draft data only.
- `lib/admin.ts` — `requireAdmin()` guard; call at the top of every admin page/action before any DB op (there is no RLS behind it).
- `app/admin/` — calibration desk; all writes run server-side after `requireAdmin`. Admins see `correct_index` (they're calibrating); players never do.
- `app/play/actions.ts` — server-authoritative serve/grade. `beginAttempt` / `serveLevel` / `submitLevel`. Scored serving stores `served_question_ids` + `served_at` in `attempt_levels` (server-only; unique per attempt+level); grading reads `correct_index` only here. `correct_index` reaches the client **only** post-submit, per question.
- `lib/play.ts` — pure helpers: `isoWeek`, `tierFor`, `destinationFor`, `doorFor`, `scoreFromLevels`, `shuffle`, thresholds.
- `lib/current-user.ts` — `currentVerifiedUser()` shared by play + funnel actions.
- `app/play/funnel-actions.ts` — accept/dispute/join/reprove (server-side writes after ownership check); accept also posts the leaderboard entry + raffle entry.
- `lib/raffu.ts` — `server-only` cross-project insert into raffu's `entries` via raffu's anon key (`enterRaffle`, `raffleSlugFor`).
- `app/leaderboard/` — live per-category board (`actions.ts` `loadLeaderboard`, polled every 10s by the client).
- `app/raffle/`, `app/admin/raffle/` — player raffle view + admin draw.
- `app/card/[attemptId]/` — public shareable score card.
- `app/safeguarding/`, `app/admin/safeguarding/` — anonymous report + admin review.
- `app/admin/dashboard/` — Recharts funnel dashboard (server compute + client charts).
- `lib/email.ts` — `server-only` Resend HTTP wrapper. `lib/rate-limit.ts` — in-memory limiter.
- `components/site-footer.tsx` — safeguarding link + Foundation acknowledgment.
- `lib/db/` — `schema.ts` (Drizzle tables, incl. Better Auth's `user`/`session`/`account`/`verification`), `index.ts` (`server-only` pg Pool + Drizzle `db`). `drizzle/` holds generated SQL migrations.
- `lib/auth.ts` — Better Auth instance. `lib/current-user.ts` — `currentUser` / `currentUserWithProfile` / `currentVerifiedUser`. `lib/otp.ts` — Twilio Verify. `lib/ids.ts` — `isUuid`.
- `lib/anthropic.ts` — `server-only` Anthropic client for the admin generation flow; model id in `GENERATION_MODEL`.
- `tailwind.config.ts` — TTS color/font/radius tokens.

## What's being built

"Prove Your Worth" — a mobile-first web app for TTS Nigeria's *What Is Your Skill Worth?* campaign. A woman signs up once (email + password + phone OTP), names any skill, and Claude generates a **leveled, timed assessment**. She climbs Foundational → Intermediate → Advanced → Expert (3 questions/level, 60/70/85/100s, ≥2 correct advances). Reached level sets her earnings band and tier, which routes her:

- **Tier A (Level 3–4)** → QTP operator partner + CRM sync + auto-entry to the weekly raffle
- **Tier B (Level 2)** → community/workshop track + 90-day re-grade
- **Tier C (Level 0–1)** → honest feedback + foundational community route

## Intended stack (handoff §5)

Next.js 14 (App Router, TypeScript, Server Actions / Route Handlers) · Neon Postgres + Drizzle ORM + Better Auth (was Supabase until Nov 2026) · Tailwind + TTS design tokens · Anthropic API (server-side only) · Recharts (admin dashboards) · raffu (`getmobilehq/raffu`) for raffles · Resend (email) + Twilio Verify (SMS OTP) · Netlify hosting.

Planned commands (handoff §17): `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`.

## Non-negotiable rules

These override convenience everywhere. The prototype **deliberately breaks the first two** because it's a browser-only demo — production must not.

1. **Scoring and correct answers are server-only.** Serve questions *without* `correct_index`. Grade on the server. Return per-question correctness *only after* submit. Never score client-side.
2. **The timer is server-enforced.** On submit, the server checks `now() - served_at <= time_seconds + grace`; on expiry, auto-grade whatever was answered. Timing is an anti-cheat control, not UI decoration.
3. **Anthropic is server-side only.** Never call it from the browser; the API key never reaches the client. Generate questions **once per skill into a reviewed bank** (status `draft` → human calibration → `approved`), then serve a randomized approved subset. Do not generate per play.
4. **The database is server-only.** Never import `lib/db` (or expose `DATABASE_URL`) client-side. `questions` is read for players only via `serveLevel`, which never selects `correct_index`; admin/calibration reads it after `requireAdmin`.
5. **One scored attempt per user / skill / week**, enforced by a DB unique constraint on `(user_id, skill_id, week_iso)`. Practice mode is unlimited, unscored, and never on the leaderboard.
6. **Consent + safeguarding are gating** (handoff §13). No PII in URLs, query strings, or logs. Anthropic calls carry skill + category only — no PII. Consent is explicit, versioned, logged (feeds the RoPA).
7. **Every grade keeps a real next step** — never gate away the dispute path (re-prove live, or request human review routed to the calibration desk).
8. **Mastercard Foundation** pre-approval (min two weeks) gates any public comms/branding. Never abbreviate to "MCF"; it appears in body copy, not headlines.

## Architecture notes that span files

- **The AI engine (handoff §8) is the heart.** Two server prompts: a *scaffold* prompt (4 level names/focus + 4 skill-specific naira bands for the Nigerian market) and a *questions* prompt (batch of MCQs per level). Both feed a human calibration review UI (Ashley/Blessing) before anything goes live. Only `skills.status = live` and `questions.status = approved` are served.
- **Data model (handoff §7)** centers on `attempts` (one scored run/week) → `attempt_levels` (served question IDs, answers, timing, pass/fail per level) → `routings` (tier → destination → CRM sync). No RLS — server code scopes every user-data query to the caller's id.
- **raffu integration** is a separate Next.js+Supabase product. On Tier A accept, the server inserts an entry and mirrors `raffu_entry_id` into the local `raffle_entries` table (see raffu coupling above).

## Migrating from the prototype

The prototype's seven-screen flow, declared-vs-proven reveal, dispute paths, community CTA, and brand ship as-is. Replace, per the handoff §4 table: client-side answers/scoring → server; browser Anthropic call (`callClaude`, `max_tokens:1000`) → server-side reviewed bank; on-screen OTP → real SMS; seeded in-memory leaderboard → Postgres + polled board; `enterIntoRaffu()` stub → real raffu write; `window.storage` → Neon Postgres (server-only access); client timer → server-enforced.

## Brand (handoff §14)

TTS Nigeria tokens: deep-green `#004931`, brand-green `#00B75B`, lemon `#8FC14E`, yellow `#FDC00D`, cream `#FFF5CC`, red `#E9473A` (confetti only), green-50 `#EDF8EC`. Fonts: Bricolage Grotesque (display), Inter (body), no mono. 14–20px radius, sentence case, outlined-wash cards (never top-edge accent stripes), deep-green statement panels with lemon eyebrows. Mobile-first (~460px). Respect `prefers-reduced-motion`. The prototype's CSS block encodes all of this. Tagline: *"Dignified Work for a Digital Future."*

## Copy voice

Warm, plain, sentence case. Errors explain the fix. Keep the women-only frame self-attested and warm (attestation, not interrogation).
