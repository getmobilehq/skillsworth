import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isoWeek } from "@/lib/play";

// raffu integration (handoff §11, §19 decision resolved).
//
// raffu (getmobilehq/raffu) is a separate Next.js + Supabase product. Its real
// shape (verified against the source):
//   • entries schema is (raffle_id, first_name, last_name) — names only, no
//     email/phone/score, so the rich data stays in skillsworth's local mirror.
//   • entry is keyed by raffle_id; you look it up from raffles.slug.
//   • RLS allows a public/anon INSERT into entries while raffles.status =
//     'collecting' — so the anon key is sufficient (least privilege).
//   • there is NO REST API; we insert directly into raffu's Postgres.
//
// COUPLING CHOICE (§19): cross-project direct insert with raffu's ANON key.
// A shared Supabase project is NOT viable — both apps define public.profiles
// with conflicting schemas and an on_auth_user_created trigger that collide.
//
// The weekly raffle row is provisioned once in raffu's dashboard with the slug
// raffleSlugFor() returns, set to 'collecting'. If env isn't configured, this
// no-ops so the funnel still works (the local raffle_entries mirror is the
// record of truth either way).

/** Weekly raffle slug, e.g. "skill-worth-2026-W24". Matches the raffu raffle. */
export function raffleSlugFor(date: Date): string {
  return `skill-worth-${isoWeek(date)}`;
}

let cached: SupabaseClient | null = null;
function raffuClient(): SupabaseClient | null {
  const url = process.env.RAFFU_SUPABASE_URL;
  const anon = process.env.RAFFU_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!cached)
    cached = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  return cached;
}

export type RaffleEntryInput = {
  firstName: string;
  lastName: string;
  slug: string;
};

export type RaffleEntryResult = { ok: boolean; raffuEntryId: string | null };

export async function enterRaffle(
  entry: RaffleEntryInput,
): Promise<RaffleEntryResult> {
  const db = raffuClient();
  if (!db) {
    // Not configured — succeed locally so the mirror row + qualification UX
    // still work in dev. raffuEntryId stays null.
    return { ok: true, raffuEntryId: null };
  }

  try {
    // slug → raffle id (only readable while collecting/drawing, per raffu RLS).
    const { data: raffle } = await db
      .from("raffles")
      .select("id, status")
      .eq("slug", entry.slug)
      .maybeSingle();
    if (!raffle || raffle.status !== "collecting") {
      // No open raffle for this week yet — not an error for the player.
      return { ok: false, raffuEntryId: null };
    }

    // Anon insert is allowed while collecting; we can't read the row back under
    // raffu's RLS, so raffuEntryId stays null (skillsworth's mirror records it).
    const { error } = await db.from("entries").insert({
      raffle_id: raffle.id,
      first_name: entry.firstName.slice(0, 60),
      last_name: entry.lastName.slice(0, 60),
    });
    return { ok: !error, raffuEntryId: null };
  } catch {
    // Never let a raffle outage block the funnel.
    return { ok: false, raffuEntryId: null };
  }
}
