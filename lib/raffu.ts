import "server-only";
import { isoWeek } from "@/lib/play";

// raffu integration (handoff §11). raffu is a separate Next.js + Supabase raffle
// product (getmobilehq/raffu) with raffles/entries/winners and /r/[slug].
//
// OPEN DECISION (§19): shared Supabase project (direct inserts) vs. raffu API.
// This module abstracts that choice behind enterRaffle(). Default: call raffu's
// HTTP API when RAFFU_BASE_URL + RAFFU_SERVICE_KEY are set; otherwise no-op so
// the rest of the funnel still works. Either way, the caller mirrors the entry
// into the local raffle_entries table.

/** Weekly raffle slug, e.g. "skill-worth-2026-W24". */
export function raffleSlugFor(date: Date): string {
  return `skill-worth-${isoWeek(date)}`;
}

export type RaffleEntryInput = {
  name: string;
  email: string;
  phone: string | null;
  skill: string;
  band: string | null;
  score: number;
  slug: string;
};

export type RaffleEntryResult = { ok: boolean; raffuEntryId: string | null };

export async function enterRaffle(
  entry: RaffleEntryInput,
): Promise<RaffleEntryResult> {
  const base = process.env.RAFFU_BASE_URL;
  const key = process.env.RAFFU_SERVICE_KEY;
  if (!base || !key) {
    // Not configured — succeed locally without a remote id so the mirror row
    // and qualification UX still work in dev.
    return { ok: true, raffuEntryId: null };
  }

  try {
    const res = await fetch(`${base}/api/r/${entry.slug}/enter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        meta: {
          skill: entry.skill,
          band: entry.band,
          score: entry.score,
          source: "prove-your-worth",
        },
      }),
    });
    if (!res.ok) return { ok: false, raffuEntryId: null };
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, raffuEntryId: data.id ?? null };
  } catch {
    // Never let a raffle outage block the funnel.
    return { ok: false, raffuEntryId: null };
  }
}
