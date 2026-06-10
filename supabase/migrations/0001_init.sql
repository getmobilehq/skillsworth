-- Prove Your Worth — initial schema (handoff §7)
-- All tables RLS-on. correct_index and approved-answer data are reachable ONLY
-- via the service role (see lib/supabase/admin.ts). Adapt names as conventions firm up.

-- ─────────────────────────────────────────── Identity (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  phone_verified boolean default false,
  is_woman_attested boolean default false,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── Skill catalogue (admin-curated)
create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalised_name text,
  category text not null,
  status text not null default 'draft', -- draft | calibrated | live
  created_by uuid,
  created_at timestamptz default now()
);

create table skill_levels (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  level int not null,
  name text,
  focus text,
  time_seconds int not null
);

create table skill_bands (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  level int not null,
  label text,
  naira_low int,
  naira_high int
);

-- ─────────────────────────────────────────── Question bank
-- NEVER expose correct_index to the client. No anon/auth read policy below —
-- served only through a server route that strips correct_index.
create table questions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  level int not null,
  prompt text not null,
  options jsonb not null,
  correct_index int not null,
  rationale text,
  source text default 'ai', -- ai | human
  status text default 'draft', -- draft | approved | retired
  reviewed_by uuid,
  version int default 1,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── One scored attempt / user / skill / week
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  skill_id uuid references skills(id),
  week_iso text not null, -- e.g. 2026-W24
  status text default 'in_progress', -- in_progress | complete
  reached_level int default 0,
  score int default 0,
  band_label text,
  tier char(1),
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (user_id, skill_id, week_iso) -- enforces one scored run/week
);

create table attempt_levels (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  level int not null,
  served_question_ids uuid[],
  answers jsonb,
  correct_count int,
  time_used int,
  passed boolean,
  served_at timestamptz,
  graded_at timestamptz
);

-- ─────────────────────────────────────────── Accept / dispute
create table disputes (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  type text not null, -- reprove | review
  note text,
  status text default 'open', -- open | resolved
  assigned_to uuid,
  resolution text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ─────────────────────────────────────────── Funnel routing + ERP/CRM sync
create table routings (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  tier char(1),
  destination text, -- qtp | community | feedback
  synced_to_crm boolean default false,
  crm_ref text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── L1/L2 community conversions
create table community_joins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  attempt_id uuid references attempts(id),
  status text default 'joined', -- joined
  joined_at timestamptz default now()
);

-- ─────────────────────────────────────────── Raffle entry mirror (entries live in raffu)
create table raffle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  attempt_id uuid references attempts(id),
  raffle_slug text,
  raffu_entry_id text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════ Row Level Security (handoff §7)
-- Enable RLS on every table.
alter table profiles enable row level security;
alter table skills enable row level security;
alter table skill_levels enable row level security;
alter table skill_bands enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;
alter table attempt_levels enable row level security;
alter table disputes enable row level security;
alter table routings enable row level security;
alter table community_joins enable row level security;
alter table raffle_entries enable row level security;

-- Users read/update only their own rows.
create policy "own profile read" on profiles
  for select using (auth.uid() = id);
create policy "own profile upsert" on profiles
  for insert with check (auth.uid() = id);
create policy "own profile update" on profiles
  for update using (auth.uid() = id);

create policy "own attempts read" on attempts
  for select using (auth.uid() = user_id);
create policy "own attempts write" on attempts
  for insert with check (auth.uid() = user_id);
create policy "own attempts update" on attempts
  for update using (auth.uid() = user_id);

create policy "own attempt_levels read" on attempt_levels
  for select using (
    exists (select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );

create policy "own disputes read" on disputes
  for select using (
    exists (select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );
create policy "own disputes write" on disputes
  for insert with check (
    exists (select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );

create policy "own community_joins read" on community_joins
  for select using (auth.uid() = user_id);
create policy "own community_joins write" on community_joins
  for insert with check (auth.uid() = user_id);

-- Live skills and their level/band metadata are publicly readable (needed for
-- skill pick + reveal). Bands and levels carry no answer data.
create policy "live skills read" on skills
  for select using (status = 'live');
create policy "skill_levels read" on skill_levels
  for select using (
    exists (select 1 from skills s where s.id = skill_id and s.status = 'live')
  );
create policy "skill_bands read" on skill_bands
  for select using (
    exists (select 1 from skills s where s.id = skill_id and s.status = 'live')
  );

-- NOTE: questions, routings, raffle_entries get NO anon/auth policy on purpose.
-- They are reachable only via the service role (admin/server scoring). Adding a
-- client read policy to `questions` would leak correct_index — do not.
