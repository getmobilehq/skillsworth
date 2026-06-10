"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isoWeek,
  tierFor,
  scoreFromLevels,
  shuffle,
  QUESTIONS_PER_LEVEL_SERVED,
  PASS_THRESHOLD,
  TIMER_GRACE_SECONDS,
} from "@/lib/play";

// ───────────────────────────────────────────────────────────── DTOs (no answers)
export type Mode = "scored" | "practice";
export type ServedQuestion = { id: string; prompt: string; options: string[] };

export type BeginResult =
  | { ok: true; attemptId: string | null }
  | { ok: false; error: string; alreadyPlayed?: boolean };

export type ServeResult =
  | {
      ok: true;
      level: number;
      questions: ServedQuestion[];
      timeSeconds: number;
      remainingSeconds: number;
    }
  | { ok: false; error: string };

export type RevealData = {
  reachedLevel: number;
  tier: "A" | "B" | "C";
  bandLabel: string | null;
  nairaLow: number | null;
  nairaHigh: number | null;
};

export type SubmitResult =
  | {
      ok: true;
      perQuestion: { correctIndex: number; isCorrect: boolean }[];
      correctCount: number;
      passed: boolean;
      timedOut: boolean;
      terminal: boolean;
      nextLevel: number | null;
      reveal: RevealData | null;
    }
  | { ok: false; error: string };

// ───────────────────────────────────────────────────────────── helpers

async function currentVerifiedUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_verified")
    .eq("id", user.id)
    .single();
  if (!profile?.phone_verified) return null;
  return user;
}

async function levelTimeSeconds(
  db: ReturnType<typeof createAdminClient>,
  skillId: string,
  level: number,
): Promise<number> {
  const { data } = await db
    .from("skill_levels")
    .select("time_seconds")
    .eq("skill_id", skillId)
    .eq("level", level)
    .single();
  return data?.time_seconds ?? 90;
}

// ───────────────────────────────────────────────────────────── begin

export async function beginAttempt(
  skillId: string,
  mode: Mode,
): Promise<BeginResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };

  const db = createAdminClient();
  const { data: skill } = await db
    .from("skills")
    .select("status")
    .eq("id", skillId)
    .single();
  if (skill?.status !== "live")
    return { ok: false, error: "This skill isn’t available yet." };

  if (mode === "practice") return { ok: true, attemptId: null };

  const week = isoWeek(new Date());
  const { data: existing } = await db
    .from("attempts")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("skill_id", skillId)
    .eq("week_iso", week)
    .maybeSingle();

  if (existing?.status === "complete")
    return {
      ok: false,
      alreadyPlayed: true,
      error: "You’ve already proven this skill this week. Come back next week!",
    };
  if (existing) return { ok: true, attemptId: existing.id };

  const { data: created, error } = await db
    .from("attempts")
    .insert({ user_id: user.id, skill_id: skillId, week_iso: week, status: "in_progress" })
    .select("id")
    .single();
  if (error || !created) {
    // Unique-constraint race — refetch.
    const { data: race } = await db
      .from("attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("skill_id", skillId)
      .eq("week_iso", week)
      .single();
    if (race) return { ok: true, attemptId: race.id };
    return { ok: false, error: "Could not start an attempt. Try again." };
  }
  return { ok: true, attemptId: created.id };
}

// ───────────────────────────────────────────────────────────── serve (no answers)

export async function serveLevel(args: {
  attemptId: string | null;
  skillId: string;
  level: number;
  mode: Mode;
}): Promise<ServeResult> {
  const { attemptId, skillId, level, mode } = args;
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };

  const db = createAdminClient();
  const timeSeconds = await levelTimeSeconds(db, skillId, level);

  // Approved pool for this skill/level — correct_index NOT selected.
  const { data: pool } = await db
    .from("questions")
    .select("id, prompt, options")
    .eq("skill_id", skillId)
    .eq("level", level)
    .eq("status", "approved");
  if (!pool || pool.length < QUESTIONS_PER_LEVEL_SERVED)
    return { ok: false, error: "This level isn’t ready yet." };

  type PoolRow = { id: string; prompt: string; options: string[] };
  const poolRows = pool as PoolRow[];
  const byId = new Map(poolRows.map((q) => [q.id, q]));

  // Practice: ephemeral, unscored, no persistence.
  if (mode === "practice" || !attemptId) {
    const picked = shuffle(poolRows).slice(0, QUESTIONS_PER_LEVEL_SERVED);
    return {
      ok: true,
      level,
      questions: picked.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
      timeSeconds,
      remainingSeconds: timeSeconds,
    };
  }

  // Scored: verify ownership.
  const { data: attempt } = await db
    .from("attempts")
    .select("user_id, status")
    .eq("id", attemptId)
    .single();
  if (!attempt || attempt.user_id !== user.id)
    return { ok: false, error: "Attempt not found." };

  // Idempotent serve: reuse an already-served, ungraded level (anti-cheat —
  // refreshing must not reset the timer or re-roll questions).
  const { data: existingLevel } = await db
    .from("attempt_levels")
    .select("served_question_ids, served_at, graded_at")
    .eq("attempt_id", attemptId)
    .eq("level", level)
    .maybeSingle();

  if (existingLevel?.graded_at)
    return { ok: false, error: "This level is already submitted." };

  if (existingLevel?.served_question_ids?.length) {
    const ids: string[] = existingLevel.served_question_ids;
    const elapsed = Math.floor(
      (Date.now() - new Date(existingLevel.served_at).getTime()) / 1000,
    );
    return {
      ok: true,
      level,
      questions: ids
        .map((id) => byId.get(id))
        .filter((q): q is PoolRow => Boolean(q))
        .map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
      timeSeconds,
      remainingSeconds: Math.max(0, timeSeconds - elapsed),
    };
  }

  // First serve of this level — pick, record served_at.
  const picked = shuffle(poolRows).slice(0, QUESTIONS_PER_LEVEL_SERVED);
  const servedIds = picked.map((q) => q.id);
  await db.from("attempt_levels").insert({
    attempt_id: attemptId,
    level,
    served_question_ids: servedIds,
    served_at: new Date().toISOString(),
  });
  return {
    ok: true,
    level,
    questions: picked.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    timeSeconds,
    remainingSeconds: timeSeconds,
  };
}

// ───────────────────────────────────────────────────────────── submit + grade (server-only)

export async function submitLevel(args: {
  attemptId: string | null;
  skillId: string;
  level: number;
  mode: Mode;
  answers: number[]; // index per served question, -1 if unanswered
  servedIds: string[]; // used for practice only; scored uses stored ids
}): Promise<SubmitResult> {
  const { attemptId, skillId, level, mode, answers } = args;
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };

  const db = createAdminClient();
  const timeSeconds = await levelTimeSeconds(db, skillId, level);

  let ids: string[];
  let timedOut = false;
  let timeUsed = 0;

  if (mode === "scored" && attemptId) {
    const { data: attempt } = await db
      .from("attempts")
      .select("user_id, status")
      .eq("id", attemptId)
      .single();
    if (!attempt || attempt.user_id !== user.id)
      return { ok: false, error: "Attempt not found." };

    const { data: row } = await db
      .from("attempt_levels")
      .select("served_question_ids, served_at, graded_at")
      .eq("attempt_id", attemptId)
      .eq("level", level)
      .maybeSingle();
    if (!row?.served_question_ids?.length)
      return { ok: false, error: "This level wasn’t served. Start again." };
    if (row.graded_at)
      return { ok: false, error: "This level is already submitted." };

    ids = row.served_question_ids; // trust the server, not the client
    const elapsed = (Date.now() - new Date(row.served_at).getTime()) / 1000;
    timedOut = elapsed > timeSeconds + TIMER_GRACE_SECONDS;
    timeUsed = Math.min(Math.round(elapsed), timeSeconds);
  } else {
    // Practice — grade the client-reported ids, no persistence, no timer.
    ids = args.servedIds;
    if (!ids?.length) return { ok: false, error: "Nothing to grade." };
  }

  // Authoritative grading via service role.
  const { data: correctRows } = await db
    .from("questions")
    .select("id, correct_index")
    .in("id", ids);
  const correctById = new Map<string, number>(
    (correctRows ?? []).map((q: { id: string; correct_index: number }) => [
      q.id,
      q.correct_index,
    ]),
  );

  const perQuestion = ids.map((id, i) => {
    const correctIndex = correctById.get(id) ?? -1;
    return { correctIndex, isCorrect: answers[i] === correctIndex };
  });
  const correctCount = perQuestion.filter((p) => p.isCorrect).length;
  const passed = correctCount >= PASS_THRESHOLD;
  const terminal = !passed || level >= 4;
  const nextLevel = passed && level < 4 ? level + 1 : null;

  // Practice: return result, persist nothing.
  if (mode === "practice" || !attemptId) {
    return {
      ok: true,
      perQuestion,
      correctCount,
      passed,
      timedOut: false,
      terminal,
      nextLevel,
      reveal: null,
    };
  }

  // Scored: persist this level, recompute aggregate, finalize if terminal.
  await db
    .from("attempt_levels")
    .update({
      answers,
      correct_count: correctCount,
      time_used: timeUsed,
      passed,
      graded_at: new Date().toISOString(),
    })
    .eq("attempt_id", attemptId)
    .eq("level", level);

  const { data: graded } = await db
    .from("attempt_levels")
    .select("level, correct_count, passed")
    .eq("attempt_id", attemptId)
    .not("graded_at", "is", null);

  const gradedRows = (graded ?? []) as {
    level: number;
    correct_count: number;
    passed: boolean;
  }[];
  const reachedLevel = gradedRows
    .filter((r) => r.passed)
    .reduce((max, r) => Math.max(max, r.level), 0);
  const score = scoreFromLevels(gradedRows);
  const tier = tierFor(reachedLevel);

  // Band for reveal.
  let bandLabel: string | null = null;
  let nairaLow: number | null = null;
  let nairaHigh: number | null = null;
  if (reachedLevel >= 1) {
    const { data: band } = await db
      .from("skill_bands")
      .select("label, naira_low, naira_high")
      .eq("skill_id", skillId)
      .eq("level", reachedLevel)
      .single();
    bandLabel = band?.label ?? null;
    nairaLow = band?.naira_low ?? null;
    nairaHigh = band?.naira_high ?? null;
  }

  await db
    .from("attempts")
    .update({
      reached_level: reachedLevel,
      score,
      tier: terminal ? tier : null,
      band_label: terminal ? bandLabel : null,
      status: terminal ? "complete" : "in_progress",
      completed_at: terminal ? new Date().toISOString() : null,
    })
    .eq("id", attemptId);

  return {
    ok: true,
    perQuestion,
    correctCount,
    passed,
    timedOut,
    terminal,
    nextLevel,
    reveal: terminal
      ? { reachedLevel, tier, bandLabel, nairaLow, nairaHigh }
      : null,
  };
}
