// Ensure this week's Skill Worth raffle exists in raffu, set to 'collecting'.
//
// Idempotent: safe to run repeatedly (e.g. a Monday cron). Creates the raffle
// only if the slug doesn't already exist. The slug MUST match skillsworth's
// raffleSlug(): `skill-worth-<lowercased ISO week>`, e.g. skill-worth-2026-w24.
//
// OPS ONLY — not imported by the running app. Creating a raffle needs raffu's
// owner RLS, so this uses raffu's SERVICE-ROLE key (the runtime app only ever
// uses raffu's anon key). Keep these secrets out of the client bundle.
//
// Run (Node 20.6+ for --env-file):
//   node --env-file=.env.local scripts/ensure-weekly-raffle.mjs
// Required env:
//   RAFFU_SUPABASE_URL          raffu's project URL
//   RAFFU_SERVICE_ROLE_KEY      raffu's service-role key (ops only)
//   RAFFU_OWNER_ID              the TTS admin's user id (auth.users) in raffu

import { createClient } from "@supabase/supabase-js";

// ── ISO week, mirrors lib/play.ts isoWeek() exactly.
function isoWeek(date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
// Mirrors lib/raffu.ts raffleSlug() — lowercased for raffu's slug rule.
const raffleSlug = (weekIso) => `skill-worth-${weekIso}`.toLowerCase();

const URL = process.env.RAFFU_SUPABASE_URL;
const KEY = process.env.RAFFU_SERVICE_ROLE_KEY;
const OWNER = process.env.RAFFU_OWNER_ID;

if (!URL || !KEY || !OWNER) {
  console.error(
    "Missing env. Need RAFFU_SUPABASE_URL, RAFFU_SERVICE_ROLE_KEY, RAFFU_OWNER_ID.",
  );
  process.exit(1);
}

const week = isoWeek(new Date());
const slug = raffleSlug(week);
const db = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: readErr } = await db
  .from("raffles")
  .select("id, status")
  .eq("slug", slug)
  .maybeSingle();

if (readErr) {
  console.error("Lookup failed:", readErr.message);
  process.exit(1);
}

if (existing) {
  console.log(`✓ Raffle ${slug} already exists (status: ${existing.status}).`);
  process.exit(0);
}

const { data: created, error: insErr } = await db
  .from("raffles")
  .insert({
    owner_id: OWNER,
    slug,
    name: `Skill Worth — ${week}`,
    // TTS brand (handoff §14, §11): deep-green primary, brand-green accent.
    primary_color: "#004931",
    accent_color: "#00B75B",
    winner_mode: "count",
    winner_count: 2, // top scorer + one random (handoff §11)
    prize_mode: "same",
    prize_text: "₦20,000 + merch",
    status: "collecting",
  })
  .select("id")
  .single();

if (insErr) {
  console.error("Create failed:", insErr.message);
  process.exit(1);
}

console.log(`✓ Created raffle ${slug} (${created.id}), collecting entries.`);
