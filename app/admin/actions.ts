"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateScaffold,
  generateQuestions,
  LEVEL_SECONDS,
} from "@/lib/generation";

// How many candidate questions to generate per level (a pool to approve from).
const QUESTIONS_PER_LEVEL = 12;
// Minimum approved questions per level before a skill may go live (3 served/run).
const MIN_APPROVED_PER_LEVEL = 3;

export type AdminFormState = { error?: string };

/**
 * Create a skill and generate its full draft bank (scaffold + question pool).
 * All AI runs server-side; everything lands as 'draft' for human calibration. (§8)
 */
export async function createSkill(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!name || !category) return { error: "Add a skill name and category." };

  const db = createAdminClient();
  let skillId: string;

  try {
    const scaffold = await generateScaffold(name, category);

    const { data: skill, error: skillError } = await db
      .from("skills")
      .insert({
        name,
        normalised_name: scaffold.skill,
        category,
        status: "draft",
        created_by: admin.id,
      })
      .select("id")
      .single();
    if (skillError || !skill) throw new Error(skillError?.message ?? "insert skill");
    skillId = skill.id;

    await db.from("skill_levels").insert(
      scaffold.levels.map((l) => ({
        skill_id: skillId,
        level: l.level,
        name: l.name,
        focus: l.focus,
        time_seconds: LEVEL_SECONDS[l.level - 1] ?? 90,
      })),
    );
    await db.from("skill_bands").insert(
      scaffold.bands.map((b) => ({
        skill_id: skillId,
        level: b.level,
        label: b.label,
        naira_low: b.naira_low,
        naira_high: b.naira_high,
      })),
    );

    // Generate a question pool per level.
    for (const level of scaffold.levels) {
      const questions = await generateQuestions(
        scaffold.skill,
        level.name,
        level.focus,
        QUESTIONS_PER_LEVEL,
      );
      await db.from("questions").insert(
        questions.map((q) => ({
          skill_id: skillId,
          level: level.level,
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
          rationale: q.rationale,
          source: "ai",
          status: "draft",
        })),
      );
    }
  } catch (e) {
    return {
      error: `Generation failed: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  revalidatePath("/admin");
  redirect(`/admin/skills/${skillId}`);
}

export async function approveQuestion(questionId: string): Promise<void> {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("questions")
    .update({ status: "approved" })
    .eq("id", questionId)
    .select("skill_id")
    .single();
  if (data) revalidatePath(`/admin/skills/${data.skill_id}`);
}

export async function retireQuestion(questionId: string): Promise<void> {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("questions")
    .update({ status: "retired" })
    .eq("id", questionId)
    .select("skill_id")
    .single();
  if (data) revalidatePath(`/admin/skills/${data.skill_id}`);
}

export async function updateBand(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const bandId = String(formData.get("bandId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const low = Number(formData.get("naira_low"));
  const high = Number(formData.get("naira_high"));
  const skillId = String(formData.get("skillId") ?? "");
  if (!bandId || !Number.isFinite(low) || !Number.isFinite(high))
    return { error: "Invalid band values." };

  const db = createAdminClient();
  const { error } = await db
    .from("skill_bands")
    .update({ label, naira_low: Math.round(low), naira_high: Math.round(high) })
    .eq("id", bandId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/skills/${skillId}`);
  return {};
}

/** Set a skill live — only if every level has enough approved questions. (§8) */
export async function setSkillLive(skillId: string): Promise<AdminFormState> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: questions } = await db
    .from("questions")
    .select("level, status")
    .eq("skill_id", skillId)
    .eq("status", "approved");

  const approvedByLevel = new Map<number, number>();
  for (const q of questions ?? [])
    approvedByLevel.set(q.level, (approvedByLevel.get(q.level) ?? 0) + 1);

  const thin = [1, 2, 3, 4].filter(
    (lv) => (approvedByLevel.get(lv) ?? 0) < MIN_APPROVED_PER_LEVEL,
  );
  if (thin.length)
    return {
      error: `Each level needs ${MIN_APPROVED_PER_LEVEL}+ approved questions. Short on level(s): ${thin.join(", ")}.`,
    };

  const { error } = await db
    .from("skills")
    .update({ status: "live" })
    .eq("id", skillId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/skills/${skillId}`);
  revalidatePath("/admin");
  return {};
}
