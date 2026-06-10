"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isoWeek } from "@/lib/play";

export type DrawState = { error?: string; drawn?: boolean };

// Run the weekly draw (handoff §11): top scorer + one random from the qualified
// (Level 3+) pool. The authoritative draw lives in raffu; this mirrors the
// chosen winners into raffle_winners for the spotlight. Re-running re-draws.
export async function runDraw(): Promise<DrawState> {
  await requireAdmin();
  const db = createAdminClient();
  const week = isoWeek(new Date());
  const slug = `skill-worth-${week}`;

  const { data: pool } = await db
    .from("leaderboard_entries")
    .select("display_name, skill_name, score")
    .eq("week_iso", week)
    .eq("qualified", true)
    .order("score", { ascending: false });

  const entries = (pool ?? []) as {
    display_name: string;
    skill_name: string;
    score: number;
  }[];
  if (!entries.length) return { error: "No qualified entries yet this week." };

  const top = entries[0];
  const rest = entries.slice(1);
  const random = rest.length
    ? rest[Math.floor(Math.random() * rest.length)]
    : top;

  await db.from("raffle_winners").delete().eq("week_iso", week);
  await db.from("raffle_winners").insert([
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
