import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { skill_levels, skills } from "@/lib/db/schema";
import { currentUserWithProfile } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import PlayClient, { type LevelMeta } from "./play-client";

// Play entry (handoff §8). Guards auth + phone-verified, loads the live skill
// and its level metadata, then hands off to the client orchestrator. Serving
// and scoring happen entirely server-side (app/play/actions.ts).
export default async function PlayPage({
  params,
  searchParams,
}: {
  params: { skillId: string };
  searchParams: { mode?: string; attempt?: string; level?: string };
}) {
  const r = await currentUserWithProfile();
  if (!r) redirect("/login");
  if (!r.profile?.phone_verified) redirect("/verify");

  if (!isUuid(params.skillId)) notFound();
  const skill = await db.query.skills.findFirst({ where: eq(skills.id, params.skillId) });
  if (!skill || skill.status !== "live") notFound();

  const levels = await db
    .select({
      level: skill_levels.level,
      name: skill_levels.name,
      focus: skill_levels.focus,
      time_seconds: skill_levels.time_seconds,
    })
    .from(skill_levels)
    .where(eq(skill_levels.skill_id, skill.id))
    .orderBy(asc(skill_levels.level));

  const mode = searchParams.mode === "practice" ? "practice" : "scored";

  // Re-prove resume: ?attempt=<id>&level=<n> drops straight into one level (§5).
  const resumeAttemptId = isUuid(searchParams.attempt) ? searchParams.attempt : null;
  const reproveLevel = searchParams.level ? Number(searchParams.level) : null;

  return (
    <PlayClient
      skillId={skill.id}
      skillName={skill.name}
      levels={(levels ?? []) as LevelMeta[]}
      mode={mode}
      resumeAttemptId={resumeAttemptId}
      reproveLevel={reproveLevel}
    />
  );
}
