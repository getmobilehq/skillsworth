"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leaderboard_entries, raffle_winners } from "@/lib/db/schema";
import { isoWeek } from "@/lib/play";

export type DrawState = { error?: string; drawn?: boolean };

// Run the weekly draw (handoff §11): top scorer + one random from the qualified
// (Level 3+) pool. The authoritative draw lives in raffu; this mirrors the
// chosen winners into raffle_winners for the spotlight. Re-running re-draws.
export async function runDraw(): Promise<DrawState> {
  await requireAdmin();
  const week = isoWeek(new Date());
  const slug = `skill-worth-${week}`;

  const entries = await db
    .select({
      display_name: leaderboard_entries.display_name,
      skill_name: leaderboard_entries.skill_name,
      score: leaderboard_entries.score,
    })
    .from(leaderboard_entries)
    .where(and(eq(leaderboard_entries.week_iso, week), eq(leaderboard_entries.qualified, true)))
    .orderBy(desc(leaderboard_entries.score));
  if (!entries.length) return { error: "No qualified entries yet this week." };

  const top = entries[0];
  const rest = entries.slice(1);
  const random = rest.length
    ? rest[Math.floor(Math.random() * rest.length)]
    : top;

  await db.delete(raffle_winners).where(eq(raffle_winners.week_iso, week));
  await db.insert(raffle_winners).values([
    {
      week_iso: week,
      raffle_slug: slug,
      kind: "top",
      display_name: top.display_name,
      skill_name: top.skill_name,
      score: top.score,
    },
    {
      week_iso: week,
      raffle_slug: slug,
      kind: "random",
      display_name: random.display_name,
      skill_name: random.skill_name,
      score: random.score,
    },
  ]);

  revalidatePath("/admin/raffle");
  revalidatePath("/raffle");
  return { drawn: true };
}
