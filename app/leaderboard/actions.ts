"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leaderboard_entries } from "@/lib/db/schema";
import { currentUser } from "@/lib/current-user";

export type LeaderboardRow = {
  attempt_id: string;
  user_id: string;
  display_name: string;
  skill_name: string;
  score: number;
  qualified: boolean;
};

// Leaderboard read for signed-in users (was an RLS "authenticated" policy).
// Display-safe fields only — no email/phone ever lives in this table.
export async function loadLeaderboard(
  week: string,
  category: string,
): Promise<LeaderboardRow[]> {
  if (!(await currentUser())) return [];
  const rows = await db
    .select({
      attempt_id: leaderboard_entries.attempt_id,
      user_id: leaderboard_entries.user_id,
      display_name: leaderboard_entries.display_name,
      skill_name: leaderboard_entries.skill_name,
      score: leaderboard_entries.score,
      qualified: leaderboard_entries.qualified,
    })
    .from(leaderboard_entries)
    .where(and(eq(leaderboard_entries.week_iso, week), eq(leaderboard_entries.category, category)))
    .orderBy(desc(leaderboard_entries.score))
    .limit(50);
  return rows.map((r) => ({ ...r, attempt_id: r.attempt_id ?? "", user_id: r.user_id ?? "" }));
}
