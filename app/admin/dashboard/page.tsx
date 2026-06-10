import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { tierFor } from "@/lib/play";
import { Card, Eyebrow } from "@/components/ui";
import DashboardCharts from "./dashboard-charts";

// Admin funnel dashboard (handoff §15). Computes the key funnel metrics
// server-side and hands them to the Recharts client.
export default async function DashboardPage() {
  await requireAdmin();
  const db = createAdminClient();

  const [
    { count: signups },
    { count: verified },
    { data: completed },
    { data: communityJoins },
    { data: routings },
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("phone_verified", true),
    db
      .from("attempts")
      .select("reached_level, week_iso")
      .eq("status", "complete"),
    db.from("community_joins").select("user_id"),
    db.from("routings").select("tier, destination"),
  ]);

  const completedRows = (completed ?? []) as {
    reached_level: number;
    week_iso: string;
  }[];

  // Tier distribution from completed attempts.
  const tiers = { A: 0, B: 0, C: 0 };
  for (const r of completedRows) tiers[tierFor(r.reached_level)] += 1;

  // Plays per ISO week.
  const byWeek = new Map<string, number>();
  for (const r of completedRows)
    byWeek.set(r.week_iso, (byWeek.get(r.week_iso) ?? 0) + 1);
  const weekly = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, plays]) => ({ week, plays }));

  const diagnosed = completedRows.length;
  const communityCount = new Set(
    (communityJoins ?? []).map((c: { user_id: string }) => c.user_id),
  ).size;
  const qtpCount = (routings ?? []).filter(
    (r: { destination: string }) => r.destination === "qtp",
  ).length;

  // Diagnostic → community conversion (target 70%, §15).
  const conversion = diagnosed ? Math.round((communityCount / diagnosed) * 100) : 0;

  const funnel = [
    { stage: "Signed up", value: signups ?? 0 },
    { stage: "Verified", value: verified ?? 0 },
    { stage: "Diagnosed", value: diagnosed },
    { stage: "Community", value: communityCount },
    { stage: "QTP (A)", value: qtpCount },
  ];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
        >
          <ArrowLeft size={14} /> All skills
        </Link>
        <h1 className="mt-3 font-display text-[26px] font-extrabold text-deep">
          Funnel dashboard
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Diagnosed" value={diagnosed} />
        <Stat label="→ Community" value={`${conversion}%`} hint="target 70%" />
        <Stat label="Tier A → QTP" value={qtpCount} />
      </div>

      <DashboardCharts
        tiers={[
          { name: "A · Match-ready", value: tiers.A },
          { name: "B · Workshop", value: tiers.B },
          { name: "C · Foundational", value: tiers.C },
        ]}
        funnel={funnel}
        weekly={weekly}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card tone="wash">
      <Eyebrow tone="deep">{label}</Eyebrow>
      <div className="mt-1 font-display text-[26px] font-extrabold text-deep">
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </Card>
  );
}
