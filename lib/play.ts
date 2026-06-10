// Play/scoring helpers (handoff §8, §10). Pure functions — no DB, no secrets.

/** ISO-8601 week string, e.g. "2026-W24". Enforces one scored run/skill/week. */
export function isoWeek(date: Date): string {
  // Copy to avoid mutating; work in UTC.
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // ISO week: Thursday decides the year. Day 0 (Sun) → 7.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Tier from the highest level reached (handoff §10). */
export function tierFor(reachedLevel: number): "A" | "B" | "C" {
  if (reachedLevel >= 3) return "A";
  if (reachedLevel === 2) return "B";
  return "C";
}

export function destinationFor(tier: "A" | "B" | "C"): string {
  return tier === "A" ? "qtp" : "community";
}

/** Score = Σ (correct answers × level) across graded levels (mirrors prototype). */
export function scoreFromLevels(
  graded: { level: number; correct_count: number }[],
): number {
  return graded.reduce((sum, r) => sum + r.correct_count * r.level, 0);
}

export const QUESTIONS_PER_LEVEL_SERVED = 3; // §3.2
export const PASS_THRESHOLD = 2; // ≥2 of 3 advances
export const TIMER_GRACE_SECONDS = 3; // clock-skew / network grace on submit

/** Fisher–Yates shuffle (caller supplies randomness-tolerant input). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
