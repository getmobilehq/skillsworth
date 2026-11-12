"use server";

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attempts,
  attempt_levels,
  questions,
  skills,
  skill_bands,
  skill_levels,
} from "@/lib/db/schema";
import { currentVerifiedUser } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
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

async function levelTimeSeconds(skillId: string, level: number): Promise<number> {
  const [row] = await db
    .select({ time_seconds: skill_levels.time_seconds })
    .from(skill_levels)
    .where(and(eq(skill_levels.skill_id, skillId), eq(skill_levels.level, level)))
    .limit(1);
  return row?.time_seconds ?? 90;
}

async function ownedAttempt(attemptId: string, userId: string) {
  const [a] = await db
    .select({ user_id: attempts.user_id, status: attempts.status })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);
  return a && a.user_id === userId ? a : null;
}

async function levelRow(attemptId: string, level: number) {
  const [row] = await db
    .select({
      served_question_ids: attempt_levels.served_question_ids,
      served_at: attempt_levels.served_at,
      graded_at: attempt_levels.graded_at,
    })
    .from(attempt_levels)
    .where(and(eq(attempt_levels.attempt_id, attemptId), eq(attempt_levels.level, level)))
    .limit(1);
  return row ?? null;
}

// ───────────────────────────────────────────────────────────── begin

export async function beginAttempt(
  skillId: string,
  mode: Mode,
): Promise<BeginResult> {
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };
  if (!isUuid(skillId)) return { ok: false, error: "This skill isn’t available yet." };

  const [skill] = await db
    .select({ status: skills.status })
    .from(skills)
    .where(eq(skills.id, skillId))
    .limit(1);
  if (skill?.status !== "live")
    return { ok: false, error: "This skill isn’t available yet." };

  if (mode === "practice") return { ok: true, attemptId: null };

  const week = isoWeek(new Date());
  const thisWeek = and(
    eq(attempts.user_id, user.id),
    eq(attempts.skill_id, skillId),
    eq(attempts.week_iso, week),
  );
  const [existing] = await db
    .select({ id: attempts.id, status: attempts.status })
    .from(attempts)
    .where(thisWeek)
    .limit(1);

  if (existing?.status === "complete")
    return {
      ok: false,
      alreadyPlayed: true,
      error: "You’ve already proven this skill this week. Come back next week!",
    };
  if (existing) return { ok: true, attemptId: existing.id };

  // ON CONFLICT DO NOTHING + refetch: the unique (user, skill, week)
  // constraint is the real guard; a concurrent double-start just reuses the row.
  const [created] = await db
    .insert(attempts)
    .values({ user_id: user.id, skill_id: skillId, week_iso: week, status: "in_progress" })
    .onConflictDoNothing()
    .returning({ id: attempts.id });
  if (created) return { ok: true, attemptId: created.id };

  const [race] = await db
    .select({ id: attempts.id, status: attempts.status })
    .from(attempts)
    .where(thisWeek)
    .limit(1);
  if (race?.status === "complete")
    return {
      ok: false,
      alreadyPlayed: true,
      error: "You’ve already proven this skill this week. Come back next week!",
    };
  if (race) return { ok: true, attemptId: race.id };
  return { ok: false, error: "Could not start an attempt. Try again." };
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
  if (!isUuid(skillId) || (attemptId != null && !isUuid(attemptId)))
    return { ok: false, error: "Not found." };

  const timeSeconds = await levelTimeSeconds(skillId, level);

  // Approved pool for this skill/level — correct_index NOT selected.
  const poolRows = await db
    .select({ id: questions.id, prompt: questions.prompt, options: questions.options })
    .from(questions)
    .where(
      and(
        eq(questions.skill_id, skillId),
        eq(questions.level, level),
        eq(questions.status, "approved"),
      ),
    );
  if (poolRows.length < QUESTIONS_PER_LEVEL_SERVED)
    return { ok: false, error: "This level isn’t ready yet." };

  type PoolRow = (typeof poolRows)[number];
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
  if (!(await ownedAttempt(attemptId, user.id)))
    return { ok: false, error: "Attempt not found." };

  // Idempotent serve: reuse an already-served, ungraded level (anti-cheat —
  // refreshing must not reset the timer or re-roll questions).
  const existingLevel = await levelRow(attemptId, level);
  if (existingLevel) return replay(existingLevel);

  // First serve of this level — pick, record served_at. The unique
  // (attempt_id, level) constraint makes concurrent first-serves race-safe:
  // the loser replays the winner's row instead of re-rolling.
  const picked = shuffle(poolRows).slice(0, QUESTIONS_PER_LEVEL_SERVED);
  const [inserted] = await db
    .insert(attempt_levels)
    .values({
      attempt_id: attemptId,
      level,
      served_question_ids: picked.map((q) => q.id),
      served_at: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning({ id: attempt_levels.id });
  if (!inserted) {
    const winner = await levelRow(attemptId, level);
    if (winner) return replay(winner);
    return { ok: false, error: "Could not serve this level. Try again." };
  }
  return {
    ok: true,
    level,
    questions: picked.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    timeSeconds,
    remainingSeconds: timeSeconds,
  };

  function replay(row: NonNullable<Awaited<ReturnType<typeof levelRow>>>): ServeResult {
    if (row.graded_at) return { ok: false, error: "This level is already submitted." };
    const ids = row.served_question_ids ?? [];
    const elapsed = Math.floor(
      (Date.now() - new Date(row.served_at ?? Date.now()).getTime()) / 1000,
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
}

// ───────────────────────────────────────────────────────────── submit + grade (server-only)

export async function submitLevel(args: {
  attemptId: string | null;
  skillId: string;
  level: number;
  mode: Mode;
  answers: number[]; // index per served question, -1 if unanswered
  servedIds: string[]; // used for practice only; scored uses stored ids
  reprove?: boolean; // dispute re-prove: one level only, then finalize (§5)
}): Promise<SubmitResult> {
  const { attemptId, skillId, level, mode, answers, reprove } = args;
  const user = await currentVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in and verify your phone." };
  if (!isUuid(skillId) || (attemptId != null && !isUuid(attemptId)))
    return { ok: false, error: "Not found." };

  const timeSeconds = await levelTimeSeconds(skillId, level);

  let ids: string[];
  let timedOut = false;
  let timeUsed = 0;

  if (mode === "scored" && attemptId) {
    if (!(await ownedAttempt(attemptId, user.id)))
      return { ok: false, error: "Attempt not found." };

    const row = await levelRow(attemptId, level);
    if (!row?.served_question_ids?.length || !row.served_at)
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
    if (!ids?.length || !ids.every(isUuid))
      return { ok: false, error: "Nothing to grade." };
  }

  // Authoritative grading — the only player-path read of correct_index.
  const correctRows = await db
    .select({ id: questions.id, correct_index: questions.correct_index })
    .from(questions)
    .where(inArray(questions.id, ids));
  const correctById = new Map<string, number>(
    correctRows.map((q) => [q.id, q.correct_index]),
  );

  const perQuestion = ids.map((id, i) => {
    const correctIndex = correctById.get(id) ?? -1;
    return { correctIndex, isCorrect: answers[i] === correctIndex };
  });
  const correctCount = perQuestion.filter((p) => p.isCorrect).length;
  const passed = correctCount >= PASS_THRESHOLD;
  // A re-prove is a single-level challenge: finalize after it either way (§5).
  const terminal = reprove || !passed || level >= 4;
  const nextLevel = !reprove && passed && level < 4 ? level + 1 : null;

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
  // `graded_at IS NULL` in the WHERE makes grading single-shot: a concurrent
  // double-submit grades once and the loser is rejected.
  const gradedNow = await db
    .update(attempt_levels)
    .set({
      answers,
      correct_count: correctCount,
      time_used: timeUsed,
      passed,
      graded_at: new Date().toISOString(),
    })
    .where(
      and(
        eq(attempt_levels.attempt_id, attemptId),
        eq(attempt_levels.level, level),
        isNull(attempt_levels.graded_at),
      ),
    )
    .returning({ id: attempt_levels.id });
  if (!gradedNow.length)
    return { ok: false, error: "This level is already submitted." };

  const gradedRaw = await db
    .select({
      level: attempt_levels.level,
      correct_count: attempt_levels.correct_count,
      passed: attempt_levels.passed,
    })
    .from(attempt_levels)
    .where(and(eq(attempt_levels.attempt_id, attemptId), isNotNull(attempt_levels.graded_at)));
  const gradedRows = gradedRaw.map((r) => ({
    level: r.level,
    correct_count: r.correct_count ?? 0,
    passed: Boolean(r.passed),
  }));
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
    const [band] = await db
      .select({
        label: skill_bands.label,
        naira_low: skill_bands.naira_low,
        naira_high: skill_bands.naira_high,
      })
      .from(skill_bands)
      .where(and(eq(skill_bands.skill_id, skillId), eq(skill_bands.level, reachedLevel)))
      .limit(1);
    bandLabel = band?.label ?? null;
    nairaLow = band?.naira_low ?? null;
    nairaHigh = band?.naira_high ?? null;
  }

  await db
    .update(attempts)
    .set({
      reached_level: reachedLevel,
      score,
      tier: terminal ? tier : null,
      band_label: terminal ? bandLabel : null,
      status: terminal ? "complete" : "in_progress",
      completed_at: terminal ? new Date().toISOString() : null,
    })
    .where(eq(attempts.id, attemptId));

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
