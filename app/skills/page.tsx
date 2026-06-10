import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Trophy, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { AppShell, Eyebrow, Card, Button, Tagline } from "@/components/ui";

// Skill pick (handoff §2). Lists LIVE skills (RLS exposes only status='live').
export default async function SkillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, phone_verified")
    .eq("id", user.id)
    .single();
  if (!profile?.phone_verified) redirect("/verify");

  const { data: skills } = await supabase
    .from("skills")
    .select("id, name, category")
    .eq("status", "live")
    .order("name");

  return (
    <AppShell minScreen>
      <Eyebrow>
        {profile.first_name ? `Hi ${profile.first_name} · ` : ""}What will you
        prove?
      </Eyebrow>
      <h1 className="mt-2 font-display text-[28px] font-extrabold text-deep">
        Pick a skill.
      </h1>
      <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
        One scored run per skill each week. Practice as much as you like.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {!skills?.length ? (
          <Card tone="cream">
            <p className="text-[13.5px] leading-[1.5] text-ink">
              No live skills yet. The calibration team is preparing the first
              ones — check back soon.
            </p>
          </Card>
        ) : (
          skills.map((s) => (
            <Link
              key={s.id}
              href={`/play/${s.id}`}
              className="flex items-center justify-between rounded-card border-[1.5px] border-[#DCE6E0] bg-white px-[16px] py-[15px] transition hover:border-green"
            >
              <span>
                <span className="block text-[15px] font-semibold text-deep">
                  {s.name}
                </span>
                <span className="text-[12.5px] text-muted">{s.category}</span>
              </span>
              <ChevronRight size={18} className="text-green" />
            </Link>
          ))
        )}
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Link
          href="/leaderboard"
          className="flex flex-1 items-center justify-center gap-2 rounded-btn border-[1.5px] border-green bg-white px-[14px] py-[13px] text-[14px] font-semibold text-deep"
        >
          <Trophy size={15} /> Leaderboard
        </Link>
        <Link
          href="/raffle"
          className="flex flex-1 items-center justify-center gap-2 rounded-btn border-[1.5px] border-green bg-white px-[14px] py-[13px] text-[14px] font-semibold text-deep"
        >
          <Gift size={15} /> Raffle
        </Link>
      </div>
      <form action={signOut} className="mt-3">
        <Button type="submit" variant="ghost">
          Sign out
        </Button>
      </form>
      <Tagline />
    </AppShell>
  );
}
