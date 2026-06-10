# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This is a **pre-build** repo. There is no application code, package.json, or git yet — only:

- `PROVE_YOUR_WORTH_CLAUDE_CODE_HANDOFF.md` — the **authoritative spec** (v1.0, locked). Source of truth for *what* and *why*. Read the relevant section before writing code in any area.
- `prove-your-worth.jsx` — a single-file React **reference prototype**. Source of truth for *interaction, screen flow, copy, brand, and motion* — but it contains demo shortcuts that **must not ship** (see below).

When the spec marks a decision as open (handoff §19), surface it — do not guess.

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
