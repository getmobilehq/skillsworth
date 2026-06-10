-- M4: leaderboard + raffle (handoff §8 leaderboards, §11 raffle).

-- Denormalised, public-readable leaderboard. Holds only a display name (first +
-- last initial) — no email/phone — so it's safe to expose and stream via
-- Realtime. Written server-side on accept (service role).
create table leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid unique references attempts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  category text not null,
  skill_name text not null,
  display_name text not null,
  score int not null default 0,
  reached_level int not null default 0,
  qualified boolean not null default false, -- Level 3+ (raffle-eligible)
  week_iso text not null,
  updated_at timestamptz default now()
);
create index leaderboard_week_category_idx
  on leaderboard_entries (week_iso, category, score desc);

-- Weekly raffle winners, surfaced for the Instagram spotlight (§11). The real
-- draw runs in raffu; this mirrors the chosen winners for display.
create table raffle_winners (
  id uuid primary key default gen_random_uuid(),
  week_iso text not null,
  raffle_slug text not null,
  category text,
  kind text not null, -- top | random
  display_name text not null,
  skill_name text,
  score int,
  created_at timestamptz default now()
);

-- Referral attribution (§9 referral → extra raffle entries).
alter table profiles add column referred_by uuid references profiles(id);

-- ── RLS
alter table leaderboard_entries enable row level security;
alter table raffle_winners enable row level security;

-- Leaderboard + winners are readable by any authenticated user (display-safe
-- fields only). Writes happen via the service role on the server.
create policy "leaderboard read" on leaderboard_entries
  for select to authenticated using (true);
create policy "winners read" on raffle_winners
  for select to authenticated using (true);

-- Stream leaderboard changes to clients.
alter publication supabase_realtime add table leaderboard_entries;
