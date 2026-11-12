"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attempts,
  attempt_levels,
  community_joins,
  disputes,
  leaderboard_entries,
  profiles,
  raffle_entries,
  routings,
  skills,
} from "@/lib/db/schema";
import { currentVerifiedUser } from "@/lib/current-user";
import { tierFor, destinationFor } from "@/lib/play";
import { enterRaffle, raffleSlug } from "@/lib/raffu";
import { sendEmail, communityWelcomeHtml } from "@/lib/email";
import { isUuid } from "@/lib/ids";

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

async function ownsAttempt(attemptId: string, userId: string): Promise<boolean> {
  const [a] = await db
    .select({ user_id: attempts.user_id })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);
  return a?.user_id === userId;
}

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
  if (!isUuid(attemptId)) return { ok: false, error: "Attempt not found." };

  const [attempt] = await db
    .select({
      user_id: attempts.user_id,
      status: attempts.status,
      reached_level: attempts.reached_level,
      tier: attempts.tier,
      score: attempts.score,
      skill_id: attempts.skill_id,
      week_iso: attempts.week_iso,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);
  if (!attempt || attempt.user_id !== user.id)
    return { ok: false, error: "Attempt not found." };
  if (attempt.status !== "complete")
    return { ok: false, error: "Finish your run before accepting." };

  const tier =
    (attempt.tier as "A" | "B" | "C" | null) ?? tierFor(attempt.reached_level);
  const destination = destinationFor(tier);
  const qualified = attempt.reached_level >= 3;

  const [[skill], [profile]] = await Promise.all([
    db
      .select({ name: skills.name, category: skills.category })
      .from(skills)
      .where(eq(skills.id, attempt.skill_id!))
      .limit(1),
    db
      .select({
        first_name: profiles.first_name,
        last_name: profiles.last_name,
        referred_by: profiles.referred_by,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
  ]);
  const name = displayName(profile?.first_name, profile?.last_name);
  const slug = raffleSlug(attempt.week_iso);

  // Leaderboard post (idempotent on attempt_id) — display-safe fields only.
  const entry = {
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
  };
  await db
    .insert(leaderboard_entries)
    .values(entry)
    .onConflictDoUpdate({ target: leaderboard_entries.attempt_id, set: entry });

  // Routing + one-time raffle/referral side-effects on first accept. The
  // unique routings.attempt_id makes "first" race-safe: only the insert that
  // actually lands runs the raffle side-effects.
  const firstAccept = await db
    .insert(routings)
    .values({ attempt_id: attemptId, tier, destination, synced_to_crm: false })
    .onConflictDoNothing()
    .returning({ id: routings.id });

  if (firstAccept.length) {

    if (qualified) {
      // raffu's entries table holds only first/last name; the rich data
      // (skill, band, score) lives in skillsworth's raffle_entries mirror.
      const raffu = await enterRaffle({
        firstName: profile?.first_name ?? name,
        lastName: profile?.last_name ?? "",
        slug,
      });
      await db.insert(raffle_entries).values({
        user_id: user.id,
        attempt_id: attemptId,
        raffle_slug: slug,
        raffu_entry_id: raffu.raffuEntryId,
      });

      // Referral → extra entry for the referrer (§9).
      if (profile?.referred_by) {
        await db.insert(raffle_entries).values({
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
  if (!isUuid(attemptId)) return { ok: false, error: "Attempt not found." };
  if (!note.trim()) return { ok: false, error: "Add a note for the team." };

  if (!(await ownsAttempt(attemptId, user.id)))
    return { ok: false, error: "Attempt not found." };

  await db.insert(disputes).values({
    attempt_id: attemptId,
    type: "review",
    note: note.trim(),
    status: "open",
  });
  return { ok: true };
}

/**
 * L1/L2 community join (§12). Records the conversion; welcome email + workshop
 * enrollment are wired in M5 comms.
 */
export async function joinCommunity(attemptId: string): Promise<SimpleResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };
  if (!isUuid(attemptId)) return { ok: false, error: "Attempt not found." };

  // Ownership check — previously enforced by the RLS insert policy.
  if (!(await ownsAttempt(attemptId, user.id)))
    return { ok: false, error: "Attempt not found." };

  const [existing] = await db
    .select({ id: community_joins.id })
    .from(community_joins)
    .where(and(eq(community_joins.user_id, user.id), eq(community_joins.attempt_id, attemptId)))
    .limit(1);
  if (existing) return { ok: true };

  await db.insert(community_joins).values({
    user_id: user.id,
    attempt_id: attemptId,
    status: "joined",
  });

  // Welcome email (no-op if Resend isn't configured). Workshop enrollment is a
  // downstream integration owned by the community team.
  const [profile] = await db
    .select({ first_name: profiles.first_name })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Welcome to the TTS Community",
      html: communityWelcomeHtml(profile?.first_name ?? ""),
    });
  }
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
  if (!isUuid(attemptId)) return { ok: false, error: "Attempt not found." };

  const [attempt] = await db
    .select({
      user_id: attempts.user_id,
      reached_level: attempts.reached_level,
      skill_id: attempts.skill_id,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);
  if (!attempt || attempt.user_id !== user.id || !attempt.skill_id)
    return { ok: false, error: "Attempt not found." };
  if (attempt.reached_level >= 4)
    return { ok: false, error: "You’re already at the top level." };

  const target = attempt.reached_level + 1;

  // Fresh serve for the target level (clears any prior failed row).
  await db
    .delete(attempt_levels)
    .where(and(eq(attempt_levels.attempt_id, attemptId), eq(attempt_levels.level, target)));

  await db
    .update(attempts)
    .set({ status: "in_progress", completed_at: null, tier: null, band_label: null })
    .where(eq(attempts.id, attemptId));

  return { ok: true, skillId: attempt.skill_id, level: target };
}
