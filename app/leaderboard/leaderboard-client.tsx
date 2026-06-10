"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";

type Row = {
  attempt_id: string;
  user_id: string;
  display_name: string;
  skill_name: string;
  score: number;
  qualified: boolean;
};

// Per-category live leaderboard (handoff §8). Initial query on mount, then
// re-query whenever Realtime reports a change to leaderboard_entries.
export default function LeaderboardClient({
  week,
  currentUserId,
}: {
  week: string;
  currentUserId: string;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const supabase = createClient();

  const load = useCallback(
    async (cat: string) => {
      const { data } = await supabase
        .from("leaderboard_entries")
        .select("attempt_id, user_id, display_name, skill_name, score, qualified")
        .eq("week_iso", week)
        .eq("category", cat)
        .order("score", { ascending: false })
        .limit(50);
      setRows((data ?? []) as Row[]);
    },
    [supabase, week],
  );

  useEffect(() => {
    load(category);
  }, [category, load]);

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries" },
        () => load(category),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, category, load]);

  return (
    <div>
      <div className="mb-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-field border-[1.5px] border-[#DCE6E0] bg-white px-[14px] py-[12px] text-[14px] font-semibold text-deep outline-none focus:border-green"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {!rows.length ? (
        <div className="rounded-card border-[1.5px] border-[#DCE6E0] p-[18px] text-[13.5px] text-muted">
          No scores in {category} yet this week. Be the first.
        </div>
      ) : (
        <div>
          {rows.map((r, i) => {
            const me = r.user_id === currentUserId;
            return (
              <div
                key={r.attempt_id}
                className="flex items-center gap-[11px] border-b border-[#EEF3F0] py-[11px]"
              >
                <span
                  className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg text-[13px] font-bold ${
                    me ? "bg-green text-white" : "bg-green-50 text-deep"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-[14px]">
                  <span className={me ? "font-bold text-deep" : "font-medium text-ink"}>
                    {r.display_name}
                  </span>
                  {me && <span className="text-muted"> · you</span>}
                  <span className="block text-[11.5px] text-muted">{r.skill_name}</span>
                </span>
                {r.qualified && <Trophy size={13} className="text-green" />}
                <span className="text-[13px] font-bold text-green">{r.score}</span>
              </div>
            );
          })}
          <p className="mt-3 text-[11.5px] leading-[1.4] text-muted">
            <Trophy size={11} className="inline align-[-1px] text-green" /> = qualified
            for Friday’s raffle (Level 3+). Boards are per category, so more women
            win.
          </p>
        </div>
      )}
    </div>
  );
}
