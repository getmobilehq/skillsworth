import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gift, Star, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isoWeek } from "@/lib/play";
import { AppShell, Eyebrow, Card, Tagline } from "@/components/ui";

type Winner = {
  kind: string;
  display_name: string;
  skill_name: string | null;
};

// Player-facing weekly raffle (handoff §11). The draw runs in raffu; winners are
// mirrored into raffle_winners for the spotlight.
export default async function RafflePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const week = isoWeek(new Date());
  const { data } = await supabase
    .from("raffle_winners")
    .select("kind, display_name, skill_name")
    .eq("week_iso", week);
  const winners = (data ?? []) as Winner[];
  const top = winners.find((w) => w.kind === "top");
  const random = winners.find((w) => w.kind === "random");

  return (
    <AppShell minScreen>
      <Link
        href="/skills"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
      >
        <ArrowLeft size={14} /> Skills
      </Link>
      <h1 className="mt-2 font-display text-[26px] font-extrabold text-deep">
        Friday Night Raffle
      </h1>
      <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
        Reach <b className="text-deep">Level 3</b> on any skill and you’re entered
        automatically. Every Friday two women from the pool win — the top scorer,
        and one drawn at random.
      </p>

      <Card tone="cream" className="mt-4">
        <div className="flex items-center justify-between">
          <Eyebrow tone="deep">This week’s pot</Eyebrow>
          <Gift size={16} className="text-deep" />
        </div>
        <div className="mt-[6px] font-display text-[26px] font-extrabold text-deep">
          ₦20,000 + merch
        </div>
        <p className="mt-[6px] text-[11.5px] text-muted">
          Runs in raffu · branded in TTS colours · {week}
        </p>
      </Card>

      <div className="mt-5">
        <Eyebrow>This week’s winners</Eyebrow>
        {!top && !random ? (
          <Card tone="wash" className="mt-2">
            <p className="text-[13.5px] text-deep">
              Not drawn yet. The pool fills as women reach Level 3 — check back
              after Friday.
            </p>
          </Card>
        ) : (
          <div className="mt-2 flex flex-col gap-[10px]">
            {top && (
              <Card tone="wash">
                <div className="flex items-center gap-[9px]">
                  <Star size={15} className="text-green" />
                  <span className="text-[12.5px] font-semibold text-deep">
                    Top scorer
                  </span>
                </div>
                <div className="mt-[5px] font-display text-[20px] font-extrabold text-deep">
                  {top.display_name}
                </div>
              </Card>
            )}
            {random && (
              <Card tone="wash">
                <div className="flex items-center gap-[9px]">
                  <Gift size={15} className="text-green" />
                  <span className="text-[12.5px] font-semibold text-deep">
                    Random finisher
                  </span>
                </div>
                <div className="mt-[5px] font-display text-[20px] font-extrabold text-deep">
                  {random.display_name}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <Link
        href="/leaderboard"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-btn border-[1.5px] border-green bg-white px-[18px] py-[15px] text-[15px] font-semibold text-deep"
      >
        <Trophy size={15} /> See the leaderboard
      </Link>
      <div className="mt-auto" />
      <Tagline />
    </AppShell>
  );
}
