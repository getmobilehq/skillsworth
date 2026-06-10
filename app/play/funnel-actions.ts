"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { currentVerifiedUser } from "@/lib/current-user";
import { tierFor, destinationFor } from "@/lib/play";
import { enterRaffle } from "@/lib/raffu";

// Accept / dispute / route — the funnel (handoff §5, §10, §11, §12).

export type AcceptResult =
  | {
      ok: true;
      tier: "A" | "B" | "C";
      destination: string;
      reachedLevel: number;
      qualified: boolean;
    }
  | { ok: false; error: string };

function displayName(first?: string | null, last?: string | null): string {
  const initial = last?.trim() ? ` ${last.trim()[0]}.` : "";
  return `${first?.trim() || "Anonymous"}${initial}`;
}

/**
 * Accept the result: record routing, post to the leaderboard, and (Tier A)
 * enter the weekly raffle. Tier A routing is flagged for CRM/ERP sync
 * (synced_to_crm stays false until a worker picks it up — §10). The raffle +
 * referral side-effects run once, on first accept.
 */
export async function acceptResult(attemptId: string): Promise<AcceptResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };

  const db = createAdminClient();
  const { data: attempt } = await db
    .from("attempts")
    .select("user_id, status, reached_level, tier, band_label, score, skill_id, week_iso")
    .eq("id", attemptId)
    .single();
  if (!attempt || attempt.user_id !== user.id)
    return { ok: false, error: "Attempt not found." };
  if (attempt.status !== "complete")
    return { ok: false, error: "Finish your run before accepting." };

  const tier =
    (attempt.tier as "A" | "B" | "C" | null) ?? tierFor(attempt.reached_level);
  const destination = destinationFor(tier);
  const qualified = attempt.reached_level >= 3;

  const [{ data: skill }, { data: profile }] = await Promise.all([
    db.from("skills").select("name, category").eq("id", attempt.skill_id).single(),
    db
      .from("profiles")
      .select("first_name, last_name, phone, referred_by")
      .eq("id", user.id)
      .single(),
  ]);
  const name = displayName(profile?.first_name, profile?.last_name);
  const slug = `skill-worth-${attempt.week_iso}`;

  // Leaderboard post (idempotent on attempt_id) — display-safe fields only.
  await db.from("leaderboard_entries").upsert(
    {
      attempt_id: attemptId,
      user_id: user.id,
      category: skill?.category ?? "Other",
      skill_name: skill?.name ?? "",
      display_name: name,
      score: attempt.score,
      reached_level: attempt.reached_level,
      qualified,
      week_iso: attempt.week_iso,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id" },
  );

  // Routing + one-time raffle/referral side-effects on first accept.
  const { data: existing } = await db
    .from("routings")
    .select("id")
    .eq("attempt_id", attemptId)
    .maybeSingle();

  if (!existing) {
    await db.from("routings").insert({
      attempt_id: attemptId,
      tier,
      destination,
      synced_to_crm: false,
    });

    if (qualified) {
      const entry = await enterRaffle({
        name,
        email: user.email ?? "",
        phone: profile?.phone ?? null,
        skill: skill?.name ?? "",
        band: attempt.band_label,
        score: attempt.score,
        slug,
      });
      await db.from("raffle_entries").insert({
        user_id: user.id,
        attempt_id: attemptId,
        raffle_slug: slug,
        raffu_entry_id: entry.raffuEntryId,
      });

      // Referral → extra entry for the referrer (§9).
      if (profile?.referred_by) {
        await db.from("raffle_entries").insert({
          user_id: profile.referred_by,
          attempt_id: null,
          raffle_slug: slug,
          raffu_entry_id: null,
        });
      }
    }
  }

  return {
    ok: true,
    tier,
    destination,
    reachedLevel: attempt.reached_level,
    qualified,
  };
}

export type SimpleResult = { ok: boolean; error?: string };

/**
 * Dispute → human review. Logs a dispute for the calibration desk (Ashley).
 * The current band stands until reviewed (§5).
 */
export async function requestReview(
  attemptId: string,
  note: string,
): Promise<SimpleResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };
  if (!note.trim()) return { ok: false, error: "Add a note for the team." };

  const db = createAdminClient();
  const { data: attempt } = await db
    .from("attempts")
    .select("user_id")
    .eq("id", attemptId)
    .single();
  if (!attempt || attempt.user_id !== user.id)
    return { ok: false, error: "Attempt not found." };

  const { error } = await db.from("disputes").insert({
    attempt_id: attemptId,
    type: "review",
    note: note.trim(),
    status: "open",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * L1/L2 community join (§12). Records the conversion; welcome email + workshop
 * enrollment are wired in M5 comms.
 */
export async function joinCommunity(attemptId: string): Promise<SimpleResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("community_joins")
    .select("id")
    .eq("user_id", user.id)
    .eq("attempt_id", attemptId)
    .maybeSingle();
  if (existing) return { ok: true };

  const { error } = await db.from("community_joins").insert({
    user_id: user.id,
    attempt_id: attemptId,
    status: "joined",
  });
  if (error) return { ok: false, error: error.message };
  // TODO(M5): trigger Resend welcome + workshop enrollment.
  return { ok: true };
}

export type ReproveResult =
  | { ok: true; skillId: string; level: number }
  | { ok: false; error: string };

/**
 * Dispute → re-prove. Re-opens the attempt and resets the next level so the
 * player can attempt it live; clearing it upgrades the band (§5).
 */
export async function beginReprove(attemptId: string): Promise<ReproveResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };

  const db = createAdminClient();
  const { data: attempt } = await db
    .from("attempts")
    .select("user_id, status, reached_level, skill_id")
    .eq("id", attemptId)
    .single();
  if (!attempt || attempt.user_id !== user.id)
    return { ok: false, error: "Attempt not found." };
  if (attempt.reached_level >= 4)
    return { ok: false, error: "You’re already at the top level." };

  const target = attempt.reached_level + 1;

  // Fresh serve for the target level (clears any prior failed row).
  await db
    .from("attempt_levels")
    .delete()
    .eq("attempt_id", attemptId)
    .eq("level", target);

  await db
    .from("attempts")
    .update({
      status: "in_progress",
      completed_at: null,
      tier: null,
      band_label: null,
    })
    .eq("id", attemptId);

  return { ok: true, skillId: attempt.skill_id, level: target };
}
