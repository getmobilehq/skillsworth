import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { questions, skill_bands, skill_levels, skills } from "@/lib/db/schema";
import { Card, Eyebrow } from "@/components/ui";
import { approveQuestion, retireQuestion } from "@/app/admin/actions";
import SetLiveButton from "./set-live-button";
import BandEditor, { type BandRow } from "./band-editor";

type QuestionRow = {
  id: string;
  level: number;
  prompt: string;
  options: string[];
  correct_index: number;
  rationale: string | null;
  status: string;
};

type LevelRow = { level: number; name: string | null; focus: string | null };

const naira = (n: number | null) =>
  n == null ? "—" : `₦${Math.round(n / 1000)}k`;

export default async function SkillReview({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  // Guard against a malformed id reaching Postgres' uuid cast.
  if (!isUuid(params.id)) notFound();
  const skill = await db.query.skills.findFirst({ where: eq(skills.id, params.id) });
  if (!skill) notFound();

  // Admins see correct_index — they're calibrating (CLAUDE.md).
  const [levels, bands, qs] = await Promise.all([
    db
      .select({ level: skill_levels.level, name: skill_levels.name, focus: skill_levels.focus })
      .from(skill_levels)
      .where(eq(skill_levels.skill_id, skill.id))
      .orderBy(asc(skill_levels.level)),
    db
      .select({
        id: skill_bands.id,
        level: skill_bands.level,
        label: skill_bands.label,
        naira_low: skill_bands.naira_low,
        naira_high: skill_bands.naira_high,
      })
      .from(skill_bands)
      .where(eq(skill_bands.skill_id, skill.id))
      .orderBy(asc(skill_bands.level)),
    db
      .select({
        id: questions.id,
        level: questions.level,
        prompt: questions.prompt,
        options: questions.options,
        correct_index: questions.correct_index,
        rationale: questions.rationale,
        status: questions.status,
      })
      .from(questions)
      .where(eq(questions.skill_id, skill.id))
      .orderBy(asc(questions.level), asc(questions.created_at)),
  ]);

  const levelList = levels as LevelRow[];
  const questionList = qs as QuestionRow[];
  const bandList = bands as BandRow[];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
        >
          <ArrowLeft size={14} /> All skills
        </Link>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-extrabold text-deep">
              {skill.name}
            </h1>
            <p className="text-[13px] text-muted">
              {skill.category}
              {skill.normalised_name && skill.normalised_name !== skill.name
                ? ` · normalised: ${skill.normalised_name}`
                : ""}
            </p>
          </div>
          <SetLiveButton skillId={skill.id} isLive={skill.status === "live"} />
        </div>
      </div>

      {/* Bands */}
      <section>
        <Eyebrow tone="deep">Naira bands (monthly)</Eyebrow>
        <Card tone="plain" className="mt-2">
          {bandList.map((b) => (
            <BandEditor key={b.id} band={b} skillId={skill.id} />
          ))}
        </Card>
      </section>

      {/* Questions by level */}
      {[1, 2, 3, 4].map((lv) => {
        const meta = levelList.find((l) => l.level === lv);
        const qs = questionList.filter((q) => q.level === lv);
        const approved = qs.filter((q) => q.status === "approved").length;
        return (
          <section key={lv}>
            <div className="flex items-baseline justify-between">
              <Eyebrow>
                Level {lv} · {meta?.name ?? "—"}
                {meta?.focus ? ` · ${meta.focus}` : ""}
              </Eyebrow>
              <span className="text-[12px] font-semibold text-muted">
                {approved} approved
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {qs.map((q) => (
                <Card
                  key={q.id}
                  tone={q.status === "approved" ? "wash" : "plain"}
                  className={q.status === "retired" ? "opacity-50" : ""}
                >
                  <p className="text-[14px] font-semibold text-deep">{q.prompt}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {q.options.map((opt, i) => (
                      <li
                        key={i}
                        className={`text-[13px] ${
                          i === q.correct_index
                            ? "font-semibold text-green"
                            : "text-ink"
                        }`}
                      >
                        {i === q.correct_index ? "✓ " : "• "}
                        {opt}
                      </li>
                    ))}
                  </ul>
                  {q.rationale && (
                    <p className="mt-2 text-[12px] text-muted">{q.rationale}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {q.status}
                    </span>
                    {q.status !== "approved" && (
                      <form action={approveQuestion.bind(null, q.id)}>
                        <button className="inline-flex items-center gap-1 rounded-btn bg-green px-3 py-1.5 text-[12px] font-semibold text-white">
                          <Check size={13} /> Approve
                        </button>
                      </form>
                    )}
                    {q.status !== "retired" && (
                      <form action={retireQuestion.bind(null, q.id)}>
                        <button className="inline-flex items-center gap-1 rounded-btn border-[1.5px] border-[#DCE6E0] px-3 py-1.5 text-[12px] font-semibold text-muted">
                          <X size={13} /> Retire
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              ))}
              {!qs.length && (
                <p className="text-[13px] text-muted">No questions for this level.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
