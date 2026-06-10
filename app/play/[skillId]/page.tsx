import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlayClient, { type LevelMeta } from "./play-client";

// Play entry (handoff §8). Guards auth + phone-verified, loads the live skill
// and its level metadata, then hands off to the client orchestrator. Serving
// and scoring happen entirely server-side (app/play/actions.ts).
export default async function PlayPage({
  params,
  searchParams,
}: {
  params: { skillId: string };
  searchParams: { mode?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_verified")
    .eq("id", user.id)
    .single();
  if (!profile?.phone_verified) redirect("/verify");

  const { data: skill } = await supabase
    .from("skills")
    .select("id, name, status")
    .eq("id", params.skillId)
    .single();
  if (!skill || skill.status !== "live") notFound();

  const { data: levels } = await supabase
    .from("skill_levels")
    .select("level, name, focus, time_seconds")
    .eq("skill_id", skill.id)
    .order("level");

  const mode = searchParams.mode === "practice" ? "practice" : "scored";

  return (
    <PlayClient
      skillId={skill.id}
      skillName={skill.name}
      levels={(levels ?? []) as LevelMeta[]}
      mode={mode}
    />
  );
}
