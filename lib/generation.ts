import "server-only";
import { anthropic, GENERATION_MODEL, textOf } from "@/lib/anthropic";

// AI assessment generation (handoff §8). SERVER ONLY. Produces *draft* data for
// a human-reviewed bank — never serves directly to players. The caller persists
// results as status 'draft'; a calibrator approves before anything goes live.

export const LEVEL_SECONDS = [60, 70, 85, 100]; // Foundational→Expert (§3.2)

export type ScaffoldLevel = { level: number; name: string; focus: string };
export type ScaffoldBand = {
  level: number;
  label: string;
  naira_low: number;
  naira_high: number;
};
export type Scaffold = {
  skill: string;
  levels: ScaffoldLevel[];
  bands: ScaffoldBand[];
};

export type GeneratedQuestion = {
  prompt: string;
  options: string[];
  correct_index: number;
  rationale: string;
};

/** Strip markdown fences and parse the first JSON object/array in the text. */
function parseJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

async function complete(prompt: string, maxTokens: number): Promise<string> {
  const message = await anthropic.messages.create({
    model: GENERATION_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return textOf(message);
}

/**
 * Calibrate the level scaffold + skill-specific naira bands for a skill.
 * naira_low/high are realistic MONTHLY salaries in naira (integers).
 */
export async function generateScaffold(
  skill: string,
  category: string,
): Promise<Scaffold> {
  const prompt = `You are calibrating a skills assessment for the Nigerian BPO and tech talent market. A woman says her skill is: "${skill}" (category: ${category}).
Return ONLY valid JSON, no markdown, with this exact shape:
{"skill":"<normalised skill name>","levels":[{"level":1,"name":"Foundational","focus":"2-4 words"},{"level":2,"name":"Intermediate","focus":"2-4 words"},{"level":3,"name":"Advanced","focus":"2-4 words"},{"level":4,"name":"Expert","focus":"2-4 words"}],"bands":[{"level":1,"label":"Developmental","naira_low":80000,"naira_high":130000},{"level":2,"label":"Eligible","naira_low":130000,"naira_high":200000},{"level":3,"label":"Certified","naira_low":220000,"naira_high":380000},{"level":4,"label":"Elite","naira_low":400000,"naira_high":700000}]}
Make the naira figures realistic MONTHLY salaries for "${skill}" in Nigeria, rising by level, as plain integers in naira (no currency symbol, no commas).`;

  const data = parseJson(await complete(prompt, 1500));
  return validateScaffold(data, skill);
}

/**
 * Generate a batch of candidate MCQs for one skill/level. The caller stores
 * these as draft; calibration approves a subset (§8: generate a large pool,
 * serve a random approved subset of 3).
 */
export async function generateQuestions(
  skill: string,
  levelName: string,
  focus: string,
  count: number,
): Promise<GeneratedQuestion[]> {
  const prompt = `Generate ${count} multiple-choice questions to test "${skill}" at the "${levelName}" level (focus: ${focus}), for the Nigerian BPO / tech talent market.
Return ONLY valid JSON, no markdown, with this exact shape:
{"questions":[{"prompt":"...","options":["..","..","..",".."],"correct":0,"rationale":"one short line"}]}
Rules: exactly ${count} questions; exactly 4 options each; exactly one correct index (0-3); concise and answerable on a phone; difficulty appropriate to the ${levelName} level.`;

  const data = parseJson(await complete(prompt, 4000));
  return validateQuestions(data);
}

// ─────────────────────────────────────────────── validation (fail loud)

function validateScaffold(data: unknown, fallbackName: string): Scaffold {
  if (!data || typeof data !== "object")
    throw new Error("Scaffold: not an object");
  const d = data as Record<string, unknown>;
  const levels = d.levels;
  const bands = d.bands;
  if (!Array.isArray(levels) || levels.length !== 4)
    throw new Error("Scaffold: expected 4 levels");
  if (!Array.isArray(bands) || bands.length !== 4)
    throw new Error("Scaffold: expected 4 bands");

  const cleanLevels: ScaffoldLevel[] = levels.map((l, i) => {
    const o = l as Record<string, unknown>;
    return {
      level: i + 1,
      name: String(o.name ?? `Level ${i + 1}`),
      focus: String(o.focus ?? ""),
    };
  });
  const cleanBands: ScaffoldBand[] = bands.map((b, i) => {
    const o = b as Record<string, unknown>;
    const low = Number(o.naira_low);
    const high = Number(o.naira_high);
    if (!Number.isFinite(low) || !Number.isFinite(high))
      throw new Error(`Scaffold: band ${i + 1} has non-numeric naira`);
    return {
      level: i + 1,
      label: String(o.label ?? ""),
      naira_low: Math.round(low),
      naira_high: Math.round(high),
    };
  });

  return {
    skill: typeof d.skill === "string" && d.skill.trim() ? d.skill : fallbackName,
    levels: cleanLevels,
    bands: cleanBands,
  };
}

function validateQuestions(data: unknown): GeneratedQuestion[] {
  if (!data || typeof data !== "object")
    throw new Error("Questions: not an object");
  const arr = (data as Record<string, unknown>).questions;
  if (!Array.isArray(arr) || arr.length === 0)
    throw new Error("Questions: empty or missing array");

  return arr.map((q, i) => {
    const o = q as Record<string, unknown>;
    const options = o.options;
    if (!Array.isArray(options) || options.length !== 4)
      throw new Error(`Question ${i + 1}: must have exactly 4 options`);
    const correct = Number(o.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3)
      throw new Error(`Question ${i + 1}: correct must be 0-3`);
    const prompt = String(o.prompt ?? "").trim();
    if (!prompt) throw new Error(`Question ${i + 1}: empty prompt`);
    return {
      prompt,
      options: options.map((x) => String(x)),
      correct_index: correct,
      rationale: String(o.rationale ?? ""),
    };
  });
}
