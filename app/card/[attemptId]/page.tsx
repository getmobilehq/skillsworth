import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, Trophy } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, shareable score card (handoff §8 — shareable cards drive referrals).
// Reads display-safe fields from leaderboard_entries via the service role so the
// link works for anyone, signed in or not. No PII beyond the display name.
type Entry = {
  user_id: string;
  display_name: string;
  skill_name: string;
  score: number;
  reached_level: number;
  qualified: boolean;
};

async function getEntry(attemptId: string): Promise<Entry | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("leaderboard_entries")
    .select("user_id, display_name, skill_name, score, reached_level, qualified")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  return (data as Entry | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: { attemptId: string };
}): Promise<Metadata> {
  const entry = await getEntry(params.attemptId);
  if (!entry) return { title: "Prove Your Worth — TTS Nigeria" };
  return {
    title: `${entry.display_name} proved ${entry.skill_name} — Prove Your Worth`,
    description: `Reached Level ${entry.reached_level} on ${entry.skill_name}. What is your skill worth?`,
  };
}

export default async function CardPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const entry = await getEntry(params.attemptId);
  if (!entry) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-app">
        <div className="rounded-card bg-deep p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="font-display text-[15px] font-extrabold">
              TTS <span className="text-green">Nigeria</span>
            </span>
            <span className="inline-flex items-center gap-[5px] rounded-full bg-white/10 px-[10px] py-1 text-[11px] font-semibold text-lemon">
              <Sparkles size={12} /> Skill Worth
            </span>
          </div>

          <div className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-lemon">
            Proven worth
          </div>
          <div className="mt-2 font-display text-[30px] font-extrabold leading-tight">
            {entry.display_name} proved {entry.skill_name}.
          </div>
          <div className="mt-4 font-display text-[44px] font-extrabold leading-none text-lemon">
            Level {entry.reached_level}
          </div>
          <p className="mt-3 text-[13px] text-white/80">
            Score {entry.score}
            {entry.qualified ? (
              <span className="ml-2 inline-flex items-center gap-1 text-lemon">
                <Trophy size={13} /> In Friday’s raffle
              </span>
            ) : null}
          </p>
        </div>

        <Link
          href={`/?ref=${entry.user_id}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-green px-[18px] py-[15px] text-[15px] font-semibold text-white"
        >
          What is your skill worth? Prove it →
        </Link>
        <p className="mt-3 text-center font-display text-xs font-bold italic text-green">
          Dignified Work for a Digital Future.
        </p>
      </div>
    </main>
  );
}
