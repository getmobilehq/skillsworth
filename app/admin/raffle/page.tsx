import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isoWeek } from "@/lib/play";
import { Card, Eyebrow } from "@/components/ui";
import DrawButton from "./draw-button";

export default async function AdminRafflePage() {
  await requireAdmin();
  const db = createAdminClient();
  const week = isoWeek(new Date());

  const [{ count }, { data: winners }] = await Promise.all([
    db
      .from("leaderboard_entries")
      .select("id", { count: "exact", head: true })
      .eq("week_iso", week)
      .eq("qualified", true),
    db
      .from("raffle_winners")
      .select("kind, display_name, skill_name, score")
      .eq("week_iso", week),
  ]);

  const rows = (winners ?? []) as {
    kind: string;
    display_name: string;
    skill_name: string | null;
    score: number | null;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
        >
          <ArrowLeft size={14} /> All skills
        </Link>
        <h1 className="mt-3 font-display text-[26px] font-extrabold text-deep">
          Weekly raffle · {week}
        </h1>
        <p className="text-[13px] text-muted">
          {count ?? 0} qualified (Level 3+) {count === 1 ? "entry" : "entries"} in
          the pool.
        </p>
      </div>

      <DrawButton />

      {rows.length > 0 && (
        <section>
          <Eyebrow>Winners</Eyebrow>
          <div className="mt-2 flex flex-col gap-2">
            {rows.map((w) => (
              <Card key={w.kind} tone="wash">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-deep">
                    {w.display_name}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-green">
                    {w.kind === "top" ? "Top scorer" : "Random finisher"}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  {w.skill_name} · {w.score} pts
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
