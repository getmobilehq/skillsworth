# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The Next.js scaffold, **M0 (auth foundations)**, and **M1 (generation + calibration)** are in place:

- **M0:** signup gate (`/signup`) with women attestation + versioned consent → `profiles` write + phone OTP, OTP verify (`/verify`), login (`/login`), protected post-auth landing (`/skills`, still an M2 stub).
- **M1:** admin calibration desk (`/admin`, gated by `profiles.is_admin`). Generates a skill's scaffold + naira bands + a draft question pool via Anthropic (server-side, into `questions` as `draft`); review page (`/admin/skills/[id]`) to approve/retire/edit questions, edit bands, and set the skill `live` (gated on ≥3 approved questions per level).

- **M2:** skill pick (`/skills`, live skills only) → timed play (`/play/[skillId]`, scored or `?mode=practice`). Server serves a random approved 3-question subset **without `correct_index`**, enforces the timer server-side (idempotent serve — refresh can't reset the clock or re-roll), grades via service role, computes reached level/score/tier/band, and finalizes the attempt. One scored run per skill per week (unique constraint + completed-attempt guard); practice is unscored and persists nothing. Reveal shows band/tier + climb.

- **M3:** funnel. From the reveal, accept (records a `routings` row; Tier A flagged for CRM/ERP sync via `synced_to_crm=false`) or dispute. Dispute = re-prove live (`beginReprove` re-opens the attempt at level reached+1; clearing it upgrades the band) or human review (`disputes` row). L1/L2 reveal shows the community CTA → `community_joins`. Admin dispute desk at `/admin/disputes` (assign + resolve). Funnel actions in `app/play/funnel-actions.ts`.

- **M4:** leaderboard + raffle. On accept, `acceptResult` posts a display-safe `leaderboard_entries` row (no PII beyond first name + last initial) and, for Tier A, enters the weekly raffle via `lib/raffu.ts` + mirrors `raffle_entries`. `/leaderboard` is per-category and **realtime** (browser subscribes to `leaderboard_entries` changes). `/raffle` shows the pot + winners spotlight; admin draw at `/admin/raffle` picks top scorer + one random from the qualified pool into `raffle_winners`. Shareable score card at `/card/[attemptId]` (public, service-role read) with a `?ref=` referral that grants the referrer a bonus entry on a referred user's first Tier-A accept.

- **M5:** comms, analytics, hardening. Anonymous safeguarding report (`/safeguarding`, public/no-auth, service-role write) + admin review (`/admin/safeguarding`). Admin funnel dashboard (`/admin/dashboard`, Recharts) over the §15 metrics. Email via `lib/email.ts` (Resend HTTP API, no-op if unset) wired into community-join welcome. In-memory rate limiter (`lib/rate-limit.ts`) on OTP resend + safeguarding submit. Shared `SiteFooter` with the safeguarding link + Mastercard Foundation acknowledgment (body copy, never abbreviated). A11y: reduced-motion (global), `aria-live` timer, `aria-pressed` answer options, focus-visible rings.

**All §16 milestones (M0–M5) are implemented.** Remaining for launch are operational, not code: a real Supabase project + env, the §19 decisions (esp. raffu coupling), and the deferred downstream integrations below.

Known stubs / not-yet-wired (intentional): CRM/ERP sync leaves `synced_to_crm=false` (no sync worker); workshop enrollment on community join (downstream, community-team owned); raffu entry is live (cross-project insert) but depends on the weekly raffle being provisioned in raffu's dashboard; `lib/rate-limit.ts` is per-instance (back with Redis for hard limits across instances); email/SMS require Resend/Twilio keys.

**raffu coupling (§19 — RESOLVED):** cross-project direct insert with raffu's **anon key**, in `lib/raffu.ts`. Grounded in the real raffu source (`/Users/josephagunbiade/Desktop/studio/raffu`): its `entries` table is `(raffle_id, first_name, last_name)` only, keyed by `raffle_id` (looked up from `raffles.slug`), and RLS allows a public/anon insert while `raffles.status='collecting'` — there is no REST API. `enterRaffle()` points a Supabase client at raffu's OWN project (`RAFFU_SUPABASE_URL`/`RAFFU_SUPABASE_ANON_KEY`), resolves the weekly slug → raffle id → inserts the name; the rich data (skill/band/score) stays in skillsworth's local `raffle_entries` mirror (the record of truth). Unset env = safe no-op. **A shared Supabase project is NOT viable** — both apps define `public.profiles` with conflicting schemas + an `on_auth_user_created` trigger that collide. Operational dependency: the weekly raffle must exist in raffu, set to `collecting`, with the slug `raffleSlug(week_iso)` returns — `skill-worth-<lowercased ISO week>`, e.g. `skill-worth-2026-w24` (lowercased because raffu's slug rule forbids uppercase; `isoWeek()` yields `2026-W24`). Provision it with `scripts/ensure-weekly-raffle.mjs` (idempotent). Locally: `node --env-file=.env.local scripts/ensure-weekly-raffle.mjs`. In CI it runs weekly via `.github/workflows/weekly-raffle.yml` (Mon 07:00 UTC), which reads the three values from GitHub Actions repo secrets (`RAFFU_SUPABASE_URL`, `RAFFU_SERVICE_ROLE_KEY`, `RAFFU_OWNER_ID`). That script is **ops-only**: it uses raffu's service-role key + `RAFFU_OWNER_ID` (the TTS admin's raffu user id) because creating a raffle needs owner RLS; the running app still only uses raffu's anon key. It brands the raffle TTS deep-green/brand-green and sets `winner_count=2` (top + random, §11). The leaderboard requires Realtime enabled on `leaderboard_entries` (0003 adds it to the `supabase_realtime` publication).

Reference docs:

- `PROVE_YOUR_WORTH_CLAUDE_CODE_HANDOFF.md` — the **authoritative spec** (v1.0, locked). Source of truth for *what* and *why*. Read the relevant section before writing code in any area.
- `prove-your-worth.jsx` — a single-file React **reference prototype**. Source of truth for *interaction, screen flow, copy, brand, and motion* — but it contains demo shortcuts that **must not ship** (see below). It is excluded from tsconfig; treat it as reference, not compiled code.

When the spec marks a decision as open (handoff §19), surface it — do not guess.

## Commands

`npm run dev` (local) · `npm run build` · `npm run typecheck` (tsc --noEmit) · `npm run lint`. Copy `.env.example` → `.env.local` and fill in before running. DB migrations live in `supabase/migrations`.

## Supabase project setup (required for the auth flow to run)

The M0 signup flow depends on project-level Supabase config that is NOT in code:

- **Email confirmation OFF.** Phone OTP is the verification step, not email. `signup` writes the `profiles` row immediately after `signUp`, which needs the session that `signUp` only returns when email confirmation is disabled. (Auth → Providers → Email → "Confirm email" off.)
- **SMS provider for phone OTP.** Without it, `updateUser({ phone })` / `verifyOtp` won't send/verify codes (phone OTP uses the `phone_change` flow on an already-created account). The project uses **eBulkSMS** (a Nigerian provider not natively supported by Supabase) via a **Send SMS auth hook**: the Edge Function `supabase/functions/send-sms/` verifies the webhook and delivers through eBulkSMS's `sendsms.json`. Deploy + config steps are in that function's header comment; it needs the `SEND_SMS_HOOK_SECRET` / `EBULKSMS_USERNAME` / `EBULKSMS_APIKEY` / `EBULKSMS_SENDER` function secrets (set via `supabase secrets set`, not the app `.env`).
- Run `supabase/migrations/0001_init.sql` against the project (creates tables + RLS).

The auth flow cannot be exercised end-to-end locally until a real Supabase project is wired into `.env.local`.

## Layout

- `app/` — App Router pages: `page.tsx` (hook), `signup/`, `verify/`, `login/`, `skills/` — each with co-located `actions.ts` server actions for auth. `globals.css` holds the TTS token CSS vars + font imports + reduced-motion rule.
- `components/ui.tsx` — shared TTS-brand primitives (AppShell, Field, Button, Card, Eyebrow…). Reuse these rather than re-inlining prototype styles.
- `lib/account.ts` — `CONSENT_VERSION` (bump on consent copy change) + `normalizePhoneNG` (→ E.164).
- `lib/generation.ts` — `server-only` Anthropic generation (`generateScaffold`, `generateQuestions`) with strict JSON validation; returns draft data only.
- `lib/admin.ts` — `requireAdmin()` guard; call at the top of every admin page/action before any service-role op.
- `app/admin/` — calibration desk; all writes go through the service-role client after `requireAdmin`. Admins see `correct_index` (they're calibrating); players never do.
- `app/play/actions.ts` — server-authoritative serve/grade. `beginAttempt` / `serveLevel` / `submitLevel`. Scored serving stores `served_question_ids` + `served_at` in `attempt_levels` (written via service role — no client write policy by design); grading reads `correct_index` only here. `correct_index` reaches the client **only** post-submit, per question.
- `lib/play.ts` — pure helpers: `isoWeek`, `tierFor`, `destinationFor`, `doorFor`, `scoreFromLevels`, `shuffle`, thresholds.
- `lib/current-user.ts` — `currentVerifiedUser()` shared by play + funnel actions.
- `app/play/funnel-actions.ts` — accept/dispute/join/reprove (service-role writes after ownership check); accept also posts the leaderboard entry + raffle entry.
- `lib/raffu.ts` — `server-only` cross-project insert into raffu's `entries` via raffu's anon key (`enterRaffle`, `raffleSlugFor`).
- `app/leaderboard/` — realtime per-category board (browser Supabase subscription).
- `app/raffle/`, `app/admin/raffle/` — player raffle view + admin draw.
- `app/card/[attemptId]/` — public shareable score card.
- `app/safeguarding/`, `app/admin/safeguarding/` — anonymous report + admin review.
- `app/admin/dashboard/` — Recharts funnel dashboard (server compute + client charts).
- `lib/email.ts` — `server-only` Resend HTTP wrapper. `lib/rate-limit.ts` — in-memory limiter.
- `components/site-footer.tsx` — safeguarding link + Foundation acknowledgment.
- `lib/supabase/` — `client.ts` (browser, anon), `server.ts` (RLS-scoped, Server Components/Actions/Route Handlers), `admin.ts` (service role, `server-only`, the *only* path to `correct_index`/grading), `middleware.ts` (session refresh).
- `lib/anthropic.ts` — `server-only` Anthropic client for the admin generation flow; model id in `GENERATION_MODEL`.
- `middleware.ts` — root middleware wiring Supabase session refresh.
- `tailwind.config.ts` — TTS color/font/radius tokens.

## What's being built

"Prove Your Worth" — a mobile-first web app for TTS Nigeria's *What Is Your Skill Worth?* campaign. A woman signs up once (email + password + phone OTP), names any skill, and Claude generates a **leveled, timed assessment**. She climbs Foundational → Intermediate → Advanced → Expert (3 questions/level, 60/70/85/100s, ≥2 correct advances). Reached level sets her earnings band and tier, which routes her:

- **Tier A (Level 3–4)** → QTP operator partner + CRM sync + auto-entry to the weekly raffle
- **Tier B (Level 2)** → community/workshop track + 90-day re-grade
- **Tier C (Level 0–1)** → honest feedback + foundational community route

## Intended stack (handoff §5)

Next.js 14 (App Router, TypeScript, Server Actions / Route Handlers) · Supabase (Auth + Postgres with RLS + Realtime) · Tailwind + TTS design tokens · Anthropic API (server-side only) · Recharts (admin dashboards) · raffu (`getmobilehq/raffu`) for raffles · Resend (email) + Twilio/MessageBird (SMS OTP) · Vercel hosting.

Planned commands (handoff §17): `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`. Migrations live in `supabase/migrations`.

## Non-negotiable rules

These override convenience everywhere. The prototype **deliberately breaks the first two** because it's a browser-only demo — production must not.

1. **Scoring and correct answers are server-only.** Serve questions *without* `correct_index`. Grade on the server. Return per-question correctness *only after* submit. Never score client-side.
2. **The timer is server-enforced.** On submit, the server checks `now() - served_at <= time_seconds + grace`; on expiry, auto-grade whatever was answered. Timing is an anti-cheat control, not UI decoration.
3. **Anthropic is server-side only.** Never call it from the browser; the API key never reaches the client. Generate questions **once per skill into a reviewed bank** (status `draft` → human calibration → `approved`), then serve a randomized approved subset. Do not generate per play.
4. **Never expose the service-role key client-side.** `questions` has no anon/auth read policy — it's reachable only through a server route that strips `correct_index`, or via the service role for admin/calibration.
5. **One scored attempt per user / skill / week**, enforced by a DB unique constraint on `(user_id, skill_id, week_iso)`. Practice mode is unlimited, unscored, and never on the leaderboard.
6. **Consent + safeguarding are gating** (handoff §13). No PII in URLs, query strings, or logs. Anthropic calls carry skill + category only — no PII. Consent is explicit, versioned, logged (feeds the RoPA).
7. **Every grade keeps a real next step** — never gate away the dispute path (re-prove live, or request human review routed to the calibration desk).
8. **Mastercard Foundation** pre-approval (min two weeks) gates any public comms/branding. Never abbreviate to "MCF"; it appears in body copy, not headlines.

## Architecture notes that span files

- **The AI engine (handoff §8) is the heart.** Two server prompts: a *scaffold* prompt (4 level names/focus + 4 skill-specific naira bands for the Nigerian market) and a *questions* prompt (batch of MCQs per level). Both feed a human calibration review UI (Ashley/Blessing) before anything goes live. Only `skills.status = live` and `questions.status = approved` are served.
- **Data model (handoff §7)** centers on `attempts` (one scored run/week) → `attempt_levels` (served question IDs, answers, timing, pass/fail per level) → `routings` (tier → destination → CRM sync). All tables RLS-on; users see only their own rows.
- **raffu integration** is a separate Next.js+Supabase product. On Tier A accept, the server inserts an entry and mirrors `raffu_entry_id` into the local `raffle_entries` table. Whether to share the Supabase project or call raffu's API is an open decision (§19).

## Migrating from the prototype

The prototype's seven-screen flow, declared-vs-proven reveal, dispute paths, community CTA, and brand ship as-is. Replace, per the handoff §4 table: client-side answers/scoring → server; browser Anthropic call (`callClaude`, `max_tokens:1000`) → server-side reviewed bank; on-screen OTP → real SMS; seeded in-memory leaderboard → Supabase + Realtime; `enterIntoRaffu()` stub → real raffu write; `window.storage` → Supabase Postgres with RLS; client timer → server-enforced.

## Brand (handoff §14)

TTS Nigeria tokens: deep-green `#004931`, brand-green `#00B75B`, lemon `#8FC14E`, yellow `#FDC00D`, cream `#FFF5CC`, red `#E9473A` (confetti only), green-50 `#EDF8EC`. Fonts: Bricolage Grotesque (display), Inter (body), no mono. 14–20px radius, sentence case, outlined-wash cards (never top-edge accent stripes), deep-green statement panels with lemon eyebrows. Mobile-first (~460px). Respect `prefers-reduced-motion`. The prototype's CSS block encodes all of this. Tagline: *"Dignified Work for a Digital Future."*

## Copy voice

Warm, plain, sentence case. Errors explain the fix. Keep the women-only frame self-attested and warm (attestation, not interrogation).
