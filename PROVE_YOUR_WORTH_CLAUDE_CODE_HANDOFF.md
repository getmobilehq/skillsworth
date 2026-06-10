# Prove Your Worth — Claude Code Build Handoff (v1.0)

**Product:** Prove Your Worth — the gamified lead + skill-calibration engine for the *What Is Your Skill Worth?* campaign (TTS Nigeria, Pillar 2 — Transitioning Women to Work).
**Owner:** Community Lead (TBC) + Pillar Lead (Joseph Agunbiade).
**Status:** Spec locked for v1.0 production build. Reference prototype shipped (`prove-your-worth.jsx`).
**Audience for this doc:** a Claude Code agent (or developer using Claude Code) building the production app.

---

## 0. How to use this handoff

Build in the milestone order in §16. Before writing code in an area, read the matching section here; this document is the source of truth for *what* and *why*. `prove-your-worth.jsx` is the source of truth for *interaction and visual feel* — but it contains demo shortcuts that **must not** ship (see §4). When a decision is still open, it's listed in §19 — surface it, don't guess.

Two rules that override convenience everywhere:
1. **Scoring and correct answers are server-only.** The client never receives a correct answer until after the server has graded a submission. The prototype breaks this on purpose (it's a demo); production must not.
2. **Consent and child/woman-safety are gating.** No PII capture, no comms, no data sharing happens outside the consent + safeguarding model in §13.

---

## 1. Context — the campaign this serves

TTS Nigeria moves Nigerian women (18–35) into BPO-grade work, for local operators and international buyers. Pillar 2 runs four campaigns; *What Is Your Skill Worth?* is the **supply side** — it builds a community of women calibrated to the real market bar and feeds match-ready talent into **QTP** (the operator-partnership campaign). Prove Your Worth is the engine that does the finding, calibrating, and routing.

The bet: give a woman an honest, fast read on what her skill is worth, make it a game worth playing and sharing, grade her honestly, and route her by grade — match-ready women to operators, everyone else into free training and community. Year-one target context: 100,000 women diagnosed; 70% diagnostic→community; 25% community→cohort; cost per cohort-ready candidate 40–60% below NYSC benchmarks.

---

## 2. What Prove Your Worth is

A mobile-first web app. A woman creates a one-time account (email + password + verified phone), picks **any** skill, and Claude generates a **leveled, timed assessment** for that exact skill. She climbs Foundational → Intermediate → Advanced → Expert; the level she reaches sets her **earnings band** and **grade (A/B/C)**. She can **accept** or **dispute** the result. Level 3+ auto-enters the weekly **raffle**; Level 1–2 get a call to action to **join the TTS Community** for free training and placement. Per-category leaderboards and a Friday raffle drive return visits and referrals.

The loop: **hook → sign up + OTP → pick skill → AI builds test → timed play → score reveal (declared vs proven) → accept/dispute → route (QTP / community / feedback) → leaderboard + Friday raffle.**

---

## 3. Locked product decisions (authoritative spec)

1. **Any-skill, AI-generated assessment.** No fixed per-category quiz. Claude generates the level scaffold, the skill-specific naira bands, and the questions. (Production caches + human-reviews these — see §8.)
2. **Four levels, timed.** Foundational(60s) → Intermediate(70s) → Advanced(85s) → Expert(100s). 3 questions/level; **≥2 correct advances**. Timer is **server-enforced**; on expiry, auto-grade with whatever was answered. Timing is an anti-cheat control.
3. **One scored run per user, per skill, per week.** Practice mode is unlimited and unscored, never on the leaderboard.
4. **Score → band → tier → door.** Reached level sets the band (skill-specific) and tier: **A (Level 3–4) → QTP partner**; **B (Level 2) → workshop track + 90-day re-grade**; **C (Level 0–1) → honest feedback + foundational route**.
5. **Accept or dispute.** Dispute = either **re-prove** (attempt the next level live; clearing it upgrades the band) or **request human review** (note routed to the calibration team / Ashley; current band stands until reviewed).
6. **One-time account + phone OTP.** Email is the username; password + phone, verified by OTP at signup. Returning users log in (no OTP).
7. **Level 3+ auto-enters the weekly raffle**; Level 1–2 see the **join-the-community** CTA. Raffle draw = top scorer + one random from the qualified (L3+) pool. (Inclusion trade-off flagged in §19.)
8. **Per-category leaderboards**, live. Shareable score cards drive referrals (referral → extra raffle entries).
9. **Women-only**, warm self-attestation at signup. Inclusion (women with personal circumstances, IDPs) carried through routing and the raffle.
10. **Confetti celebrates each level clear.** Brand colours; respect `prefers-reduced-motion`.

---

## 4. The reference prototype — copy this, replace that

`prove-your-worth.jsx` is the visual + interaction reference. Match its screen flow, copy, brand, and motion. **Replace these demo shortcuts in production:**

| Prototype shortcut | Production requirement |
|---|---|
| Correct answers + scoring live in the client | Server-only. Serve questions **without** `correct_index`; score on the server; return per-question correctness only after submit. |
| Claude called from the browser, per play, `max_tokens:1000` | Call Anthropic **server-side** (key never in client). Generate **once per skill into a reviewed bank**; serve a randomized approved subset. Server controls `max_tokens` (the 1000 cap was an artifact-only limit). |
| OTP code shown on screen | Real SMS OTP (Supabase phone auth / Twilio). |
| Seeded in-memory leaderboard | Supabase table + Realtime, per category. |
| `enterIntoRaffu()` stub | Real server-side write to raffu (see §11). |
| `window.storage` persistence | Supabase Postgres with RLS. |
| Timer client-side only | Timer enforced server-side on submit. |

Everything else — the seven-screen flow, the declared-vs-proven reveal, the dispute paths, the CTA, the brand — ships as-is.

---

## 5. Tech stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (App Router, TypeScript, Server Actions / Route Handlers) | Server-side secrets (Anthropic key, OTP, raffu writes) and **same stack as raffu** — share a Supabase project or a monorepo. |
| Styling | Tailwind CSS + **TTS design tokens** | Brand fidelity; tokens in the TTS design-system zip (`colors_and_type.css`). |
| Auth | Supabase Auth (`@supabase/ssr`) — email/password + **phone OTP** | One provider for auth, DB, realtime; matches raffu. |
| Database | Supabase Postgres + **RLS** | Per-user isolation; admin/calibration via service role. |
| Realtime | Supabase Realtime | Live leaderboards. |
| AI | **Anthropic API**, server-side only | Assessment generation; never exposed to the client. |
| Charts | Recharts | Admin funnel dashboards (mirrors the ERP). |
| Raffle | **raffu** (`getmobilehq/raffu`) — Next.js + Supabase | Reuse existing raffle product; per-raffle TTS branding. |
| Email/SMS | Resend (email), Twilio/MessageBird (SMS OTP) | raffu already uses Resend. |
| Hosting | Vercel | Matches raffu. |

> The internal ERP is Vite/React (Midnight Gold). This is a **separate, public, TTS-brand** app; Next.js is the right call here for server-side work and raffu alignment. Sync to the ERP/CRM happens via API (§10).

---

## 6. System architecture

```
                 ┌─────────────────────────── Browser (mobile-first, TTS brand) ──────────────────┐
                 │  hook → signup+OTP → skillpick → play(timed) → reveal → accept/dispute → result │
                 └───────────────▲───────────────────────────────────────────────▲────────────────┘
                                 │ serves questions (NO answers), timer state      │ submit answers
                                 │                                                 ▼
        ┌────────────────────────┴───────────────── Next.js server (Route Handlers / Server Actions) ─────────┐
        │  • Auth + OTP (Supabase)            • Serve attempt level (random approved subset, no correct_index) │
        │  • Server-side SCORING + timer      • Grade → band/tier  • Route funnel  • Raffle entry (raffu)      │
        │  • Admin: generate (Anthropic) → calibrate → approve bank                                            │
        └───────┬───────────────────────┬───────────────────────────┬──────────────────────┬─────────────────┘
                ▼                        ▼                           ▼                      ▼
         Anthropic API            Supabase Postgres            raffu (Supabase)       ERP / CRM (Elizabeth)
       (generation only)     (profiles, skills, questions,    (raffles/entries/      (Tier A handoff,
                              attempts, disputes, joins,        winners; /r/[slug])    matching, onboarding)
                              leaderboard, consent/RoPA)
```

---

## 7. Data model (Supabase Postgres)

Indicative DDL — adapt names to repo conventions. All tables RLS-on. `correct_index` and approved-answer data are reachable **only** via the service role.

```sql
-- Identity (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text, last_name text,
  phone text, phone_verified boolean default false,
  is_woman_attested boolean default false,
  consent_at timestamptz, consent_version text,
  created_at timestamptz default now()
);

-- Skill catalogue (admin-curated; generated then reviewed)
create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null, normalised_name text, category text not null,
  status text not null default 'draft',          -- draft | calibrated | live
  created_by uuid, created_at timestamptz default now()
);
create table skill_levels (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  level int not null, name text, focus text, time_seconds int not null
);
create table skill_bands (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  level int not null, label text, naira_low int, naira_high int
);

-- Question bank (NEVER expose correct_index to client)
create table questions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  level int not null, prompt text not null, options jsonb not null,
  correct_index int not null, rationale text,
  source text default 'ai',                        -- ai | human
  status text default 'draft',                     -- draft | approved | retired
  reviewed_by uuid, version int default 1, created_at timestamptz default now()
);

-- One scored attempt per user / skill / week
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  skill_id uuid references skills(id),
  week_iso text not null,                          -- e.g. 2026-W24
  status text default 'in_progress',               -- in_progress | complete
  reached_level int default 0, score int default 0,
  band_label text, tier char(1),
  started_at timestamptz default now(), completed_at timestamptz,
  unique (user_id, skill_id, week_iso)             -- enforces one scored run/week
);
create table attempt_levels (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  level int not null, served_question_ids uuid[],
  answers jsonb, correct_count int, time_used int, passed boolean,
  served_at timestamptz, graded_at timestamptz
);

-- Accept / dispute
create table disputes (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  type text not null,                              -- reprove | review
  note text, status text default 'open',           -- open | resolved
  assigned_to uuid, resolution text,
  created_at timestamptz default now(), resolved_at timestamptz
);

-- Funnel routing + ERP/CRM sync
create table routings (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  tier char(1), destination text,                  -- qtp | community | feedback
  synced_to_crm boolean default false, crm_ref text, created_at timestamptz default now()
);

-- L1/L2 community conversions
create table community_joins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id), attempt_id uuid references attempts(id),
  status text default 'joined', joined_at timestamptz default now()
);

-- Raffle entry mirror (entries themselves live in raffu)
create table raffle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id), attempt_id uuid references attempts(id),
  raffle_slug text, raffu_entry_id text, created_at timestamptz default now()
);
```

**RLS sketch:** users read/update only their own `profiles`, `attempts`, `attempt_levels`, `disputes`, `community_joins`. `questions` has **no** anon/auth read policy — served only through a server route that strips `correct_index`. Calibration/admin reads via service role or an `is_admin` claim.

---

## 8. The AI assessment engine (the heart)

**Generation (admin, server-side):**
1. Admin enters a skill + category → server calls Anthropic for the **scaffold** (4 level names/focus, 4 skill-specific naira bands for the Nigerian market) → rows in `skill_levels`, `skill_bands` (status `draft`).
2. Server calls Anthropic per level for a **batch of ~10–15 candidate questions** (MCQ: prompt, 4 options, correct index, rationale) → rows in `questions` (status `draft`). Use a real `max_tokens` (e.g. 2000–4000); batch as needed.
3. **Calibration review UI** (Ashley / Blessing): edit/approve/retire questions, edit bands, set `skills.status = live`. Only **approved** questions and **live** skills are served.

**Why a reviewed bank, not per-play generation:** consistency (two women with the same skill get equivalent tests), cost control (generate once), quality (human bar via Ashley/Blessing), and anti-cheat (serve a random subset from a large approved pool).

**Prompts** (server-side; adapt the prototype's two prompts):
- *Scaffold:* "Calibrate a skills assessment for the Nigerian BPO/tech market for skill X (category C). Return JSON {skill, levels[4]{n,name,focus}, bands[4]{level,label,naira}} with realistic rising monthly ₦ ranges."
- *Questions:* "Generate N MCQs for skill X at level L (focus). JSON {questions:[{q,options[4],correct,why}]}, one correct index, phone-answerable, level-appropriate difficulty."

**Serving + scoring (anti-cheat):**
- On level start, server picks a random approved subset (3) for that skill/level, records `served_question_ids` + `served_at`, returns prompts + options **only**.
- On submit, server checks `now() - served_at <= time_seconds + grace`; if over, grade with received answers and mark timed-out. Compare answers to `correct_index` server-side, write `attempt_levels`, return per-question correctness for the reveal.
- Advance if `correct_count >= 2`. Update `attempts.reached_level`, `score`, `band_label`, `tier`. Enforce one scored attempt/skill/week via the unique constraint; practice runs are unscored and excluded from leaderboard.

---

## 9. Auth, OTP & accounts

- Supabase Auth: email/password (email = username). **Phone OTP** at signup (Supabase phone auth via Twilio/MessageBird); set `phone_verified`.
- Capture at signup: name, email, password, phone, **women-in-Nigeria attestation**, **consent** → `profiles` + a consent record (§13).
- Returning users **log in** (no OTP). "Prove another skill" returns to skill pick, never to signup.
- Consider the **sample-question taster** (one question before signup) if top-of-funnel conversion is a priority — see §19.

---

## 10. Grading, tiers & the funnel

| Reached level | Tier | Destination | Action |
|---|---|---|---|
| 3–4 | A · Match-ready | **QTP** | Create CRM lead → sync to ERP for matching (Elizabeth). Auto-enter weekly raffle. |
| 2 | B · Workshop | **Community** | Show join CTA → on join, enroll in workshop/training; schedule 90-day re-grade. |
| 0–1 | C · Filtered | **Community** | Show join CTA → free training + foundational route. Honest feedback. |

ERP/CRM sync: on Tier A accept, POST the lead to the ERP/CRM endpoint (skill, proven level, band, score, consent ref) and set `routings.synced_to_crm`. Elizabeth owns matching/onboarding downstream.

---

## 11. Raffle integration (raffu)

raffu (`getmobilehq/raffu`) is Next.js 14 + Supabase with a `raffles / entries / winners` schema and a public `/r/[slug]` entry page; per-raffle branding (2 colours + logo) — set to TTS green/deep-green.

- Create a recurring weekly raffle in raffu (slug e.g. `skill-worth-YYYY-Www`).
- On **Tier A accept**, server-side: insert one `entries` row (or `POST /api/r/[slug]/enter`) with entrant (name, email, phone) + meta (skill, band, score, source `prove-your-worth`); mirror `raffu_entry_id` in `raffle_entries`.
- Friday draw runs in raffu (top scorer + random from the qualified pool); winners surfaced back for the Instagram spotlight.
- **Decision (§19):** share the Supabase project with raffu (direct inserts) vs. call raffu's API. Direct shared-DB is simplest if both apps live in one Supabase project.

---

## 12. Community CTA & training funnel (L1/L2)

When `reached_level < 3`, show the deep-green CTA on both reveal and result: *"Ready to level up? Join the TTS Community for better job opportunities, free training, and job placement — Take action now."* On tap: write `community_joins`, trigger a welcome (Resend) + workshop enrollment, and confirm inline. This is the conversion that turns not-yet-match-ready women into the training/community pipeline (the 70% diagnostic→community target lives here).

---

## 13. Privacy, consent, safeguarding, inclusion (gating)

- **Consent at signup**, explicit, versioned, logged → feeds the programme's **RoPA** and **Candidate Consent Form**. Separate consent for WhatsApp/SMS marketing. Data minimisation; clear right to withdraw/delete.
- **Anonymous safeguarding reporting**, independent of any BPO operator, available throughout — a programme design requirement, not a feature.
- **Inclusion:** women with personal circumstances and internally displaced women carried through routing and the raffle; keep the women-only frame warm (self-attestation, not interrogation).
- **Mastercard Foundation** (never "MCF") pre-approval — minimum two weeks — for any public comms/branding before launch. Foundation appears in body copy, not headlines.
- Never put PII in URLs or logs. Anthropic calls never include more PII than needed (skill + category only).

---

## 14. Brand & design system

TTS Nigeria official system. Tokens (from the design-system zip `colors_and_type.css`): deep-green `#004931`, brand-green `#00B75B`, lemon `#8FC14E`, yellow `#FDC00D`, cream `#FFF5CC`, red `#E9473A` (confetti garnish only), green-50 `#EDF8EC`. Fonts: **Bricolage Grotesque** (display), **Inter** (body) — no mono. 14–20px radius, sentence case, outlined-wash cards (green-50 + brand-green border) — never top-edge accent stripes — deep-green statement panels with lemon eyebrows. Tagline: *"Dignified Work for a Digital Future."* Mobile-first (~460px). The prototype's CSS encodes all of this.

---

## 15. Analytics & success metrics

Track: gate completion, OTP verification rate, plays started, weekly active players, return rate, share/referral coefficient, % graded A/B/C, **declared-vs-proven divergence**, **diagnostic→community conversion** (target 70%), **community→cohort** (target 25%), Tier A → QTP placements, **cost per cohort-ready candidate** (target 40–60% below NYSC), raffle participation. Surface in an admin Recharts dashboard.

---

## 16. Build plan (milestones + acceptance)

- **M0 — Foundations.** Next.js + Supabase + Tailwind + TTS tokens; auth (email/pw + phone OTP); `profiles` + consent/RoPA logging; women attestation. ✅ *A woman can sign up, verify phone by OTP, and log in.*
- **M1 — Generation + calibration.** `skills/skill_levels/skill_bands/questions`; admin generate via Anthropic; calibration review UI; approved bank. ✅ *Ashley can generate, edit, and approve a skill's bank and set it live.*
- **M2 — Play + server scoring.** Skill pick → server serves questions (no answers) → server-enforced timer → server scoring → reveal band/tier; one scored run/week; practice mode; confetti on clear. ✅ *A woman plays a live skill, is server-scored, sees her band, cannot see answers early, cannot re-score the same skill that week.*
- **M3 — Funnel.** Accept/dispute (re-prove + human review → Ashley); tier routing (A→QTP/CRM sync, B/C→community CTA + join). ✅ *Tiers route correctly; disputes are logged and assignable; community joins recorded and trigger enrollment.*
- **M4 — Leaderboard + raffle.** Realtime per-category leaderboard; L3+ auto-entry to raffu; Friday draw + winner spotlight; shareable score cards + referral. ✅ *Scores post live; L3+ entries appear in raffu; draw runs; share card works.*
- **M5 — Comms, analytics, hardening.** Micro-campaign landing + share assets (Foundation-approved); admin funnel dashboard (Recharts); rate limiting; anonymous safeguarding report; accessibility (keyboard, reduced-motion, contrast); load test. ✅ *Dashboard live; safeguarding link works; copy approved; a11y floor met.*

---

## 17. Environment & setup

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
ANTHROPIC_API_KEY=                # server only — never shipped to client
RAFFU_BASE_URL=                   # or shared Supabase project creds
RAFFU_SERVICE_KEY=
SMS_PROVIDER_SID= / SMS_PROVIDER_TOKEN=   # Twilio/MessageBird for OTP
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```
Commands: `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`. Migrations in `supabase/migrations`.

---

## 18. Repo conventions (CLAUDE.md essentials)

**DO**
- Server-side: all Anthropic calls, all scoring, OTP, raffu writes, CRM sync.
- Strip `correct_index` from every client payload; return correctness only post-submit.
- Enforce the per-week unique attempt; keep practice unscored.
- Keep copy in the interface's voice — warm, plain, sentence case; errors explain the fix.
- Keep the women-only frame self-attested and warm.

**DO NOT**
- Never call Anthropic from the browser; never expose the service-role key client-side.
- Never send or store correct answers in the client; never score client-side.
- Never put PII in URLs, query strings, or logs.
- Never ship comms/branding without Mastercard Foundation pre-approval; never abbreviate it to "MCF".
- Never gate the dispute path away — every grade keeps a real next step.

---

## 19. Open decisions for Joseph (don't guess)

1. **Account-first vs. taster.** Require signup+OTP before play (verified, higher friction) or allow one sample question before signup (lower friction, weaker lead). *Current build: account-first.*
2. **Raffle inclusion.** Keep raffle entry at Level 3+ only, or add a second smaller "finisher's draw" open to all who complete, to preserve the inclusion mechanic.
3. **raffu coupling.** Shared Supabase project (direct inserts) vs. raffu API calls.
4. **Seed skills.** Confirm the launch set (Python/software confirmed) and who calibrates first (Ashley + Blessing).
5. **Community/training mechanics.** What "join" actually enrolls into, and the 90-day re-grade trigger.
6. **Data retention** window and deletion policy for the RoPA.

---

## 20. Who's who

- **Joseph Agunbiade** — Pillar Lead; governance, brand, Foundation pre-approval.
- **Community Lead (TBC)** — product owner of Prove Your Worth; most urgent hire.
- **Ashley** (Univelcity/Semicolon) — calibration: owns question/band review and the dispute-review desk.
- **Blessing** — skill list + demand signals; chooses launch skills.
- **Elizabeth** — CRM/matching/onboarding; receives Tier A handoffs.
- **Kenneth** — QTP lead; operator partnerships that hire Tier A women.

---

*Reference prototype: `prove-your-worth.jsx`. Brand: TTS Nigeria design system. Dignified Work for a Digital Future.*
