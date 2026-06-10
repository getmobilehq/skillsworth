import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isoWeek } from "@/lib/play";
import { AppShell, Eyebrow, Tagline } from "@/components/ui";
import LeaderboardClient from "./leaderboard-client";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const week = isoWeek(new Date());

  return (
    <AppShell minScreen>
      <Link
        href="/skills"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
      >
        <ArrowLeft size={14} /> Skills
      </Link>
      <Eyebrow>{week} · live</Eyebrow>
      <h1 className="mb-4 mt-1 font-display text-[28px] font-extrabold text-deep">
        Leaderboard.
      </h1>
      <LeaderboardClient week={week} currentUserId={user.id} />
      <div className="mt-auto" />
      <Tagline />
    </AppShell>
  );
}
