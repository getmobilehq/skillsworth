"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Timer,
  Check,
  X,
  ArrowRight,
  ChevronRight,
  ShieldQuestion,
  RotateCcw,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { AppShell, Eyebrow, Card, Button, Tagline } from "@/components/ui";
import { doorFor } from "@/lib/play";
import {
  beginAttempt,
  serveLevel,
  submitLevel,
  type Mode,
  type ServedQuestion,
  type RevealData,
} from "@/app/play/actions";
import {
  acceptResult,
  requestReview,
  joinCommunity,
  beginReprove,
} from "@/app/play/funnel-actions";

export type LevelMeta = {
  level: number;
  name: string | null;
  focus: string | null;
  time_seconds: number;
};

type Screen =
  | "intro"
  | "loading"
  | "play"
  | "graded"
  | "reveal"
  | "dispute"
  | "reviewed"
  | "accepted"
  | "blocked";
type Graded = {
  perQuestion: { correctIndex: number; isCorrect: boolean }[];
  correctCount: number;
  passed: boolean;
  timedOut: boolean;
  terminal: boolean;
  nextLevel: number | null;
};
type ClimbRow = { level: number; correctCount: number; passed: boolean };
type Accepted = { tier: "A" | "B" | "C"; destination: string; reachedLevel: number };

const CONF_COLORS = ["#E9473A", "#FDC00D", "#00B75B", "#8FC14E"];

export default function PlayClient({
  skillId,
  skillName,
  levels,
  mode,
  resumeAttemptId = null,
  reproveLevel = null,
}: {
  skillId: string;
  skillName: string;
  levels: LevelMeta[];
  mode: Mode;
  resumeAttemptId?: string | null;
  reproveLevel?: number | null;
}) {
  const router = useRouter();
  const isReprove = Boolean(resumeAttemptId && reproveLevel);

  const [screen, setScreen] = useState<Screen>(isReprove ? "loading" : "intro");
  const [attemptId, setAttemptId] = useState<string | null>(resumeAttemptId);
  const [level, setLevel] = useState(reproveLevel ?? 1);
  const [questions, setQuestions] = useState<ServedQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [climb, setClimb] = useState<ClimbRow[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [confetti, setConfetti] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<Accepted | null>(null);
  const [joined, setJoined] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");

  const answersRef = useRef<number[]>([]);
  const submittingRef = useRef(false);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const levelMeta = levels.find((l) => l.level === level);
  const allAnswered = answers.length > 0 && answers.every((a) => a >= 0);
  const reachedLevel = reveal?.reachedLevel ?? 0;

  const fireConfetti = (ms = 2400) => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), ms);
  };

  const loadLevel = useCallback(
    async (lvl: number, aId: string | null) => {
      setScreen("loading");
      setGraded(null);
      setError(undefined);
      const res = await serveLevel({ attemptId: aId, skillId, level: lvl, mode });
      if (!res.ok) {
        setError(res.error);
        setScreen("intro");
        return;
      }
      setLevel(lvl);
      setQuestions(res.questions);
      setAnswers(Array(res.questions.length).fill(-1));
      setTimeLeft(res.remainingSeconds);
      submittingRef.current = false;
      setScreen("play");
    },
    [skillId, mode],
  );

  // Re-prove resume: drop straight into the target level (§5).
  useEffect(() => {
    if (isReprove && reproveLevel) loadLevel(reproveLevel, resumeAttemptId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setError(undefined);
    const res = await beginAttempt(skillId, mode);
    if (!res.ok) {
      setError(res.error);
      if (res.alreadyPlayed) setScreen("blocked");
      return;
    }
    setAttemptId(res.attemptId);
    await loadLevel(1, res.attemptId);
  };

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const res = await submitLevel({
      attemptId,
      skillId,
      level,
      mode,
      answers: answersRef.current,
      servedIds: questions.map((q) => q.id),
      reprove: isReprove,
    });
    if (!res.ok) {
      setError(res.error);
      submittingRef.current = false;
      return;
    }
    setGraded({
      perQuestion: res.perQuestion,
      correctCount: res.correctCount,
      passed: res.passed,
      timedOut: res.timedOut,
      terminal: res.terminal,
      nextLevel: res.nextLevel,
    });
    setClimb((prev) => [
      ...prev.filter((r) => r.level !== level),
      { level, correctCount: res.correctCount, passed: res.passed },
    ]);
    if (res.reveal) setReveal(res.reveal);
    if (res.passed) fireConfetti();
    setScreen("graded");
  }, [attemptId, skillId, level, mode, questions, isReprove]);

  useEffect(() => {
    if (screen !== "play") return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [screen, timeLeft, submit]);

  const proceed = () => {
    if (graded?.passed && graded.nextLevel && !graded.terminal) {
      loadLevel(graded.nextLevel, attemptId);
    } else {
      setScreen("reveal");
    }
  };

  // ── funnel handlers (§5, §10, §12)
  const onAccept = async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(undefined);
    const res = await acceptResult(attemptId);
    setBusy(false);
    if (res.ok) {
      setAccepted({ tier: res.tier, destination: res.destination, reachedLevel: res.reachedLevel });
      setScreen("accepted");
    } else setError(res.error);
  };

  const onReprove = async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(undefined);
    const res = await beginReprove(attemptId);
    if (res.ok) {
      router.push(`/play/${res.skillId}?attempt=${attemptId}&level=${res.level}`);
    } else {
      setBusy(false);
      setError(res.error);
    }
  };

  const onReview = async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(undefined);
    const res = await requestReview(attemptId, disputeNote);
    setBusy(false);
    if (res.ok) setScreen("reviewed");
    else setError(res.error);
  };

  const onJoin = async () => {
    if (!attemptId) return;
    setBusy(true);
    const res = await joinCommunity(attemptId);
    setBusy(false);
    if (res.ok) {
      setJoined(true);
      fireConfetti(2000);
    } else setError(res.error);
  };

  const mm = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;
  const low = timeLeft <= 10;

  const proveAnother = (
    <Link
      href="/skills"
      className="flex w-full items-center justify-center gap-2 rounded-btn border-[1.5px] border-green bg-white px-[18px] py-[15px] text-[15px] font-semibold text-deep"
    >
      <Sparkles size={15} /> Prove another skill
    </Link>
  );

  const communityCTA = joined ? (
    <Card tone="wash" className="pop">
      <div className="flex items-center gap-2">
        <Check size={16} className="text-green" />
        <span className="text-[14px] font-bold text-deep">
          You’ve joined the TTS Community
        </span>
      </div>
      <p className="mt-[6px] text-[12.5px] text-muted">
        Expect an invite to free training and your first workshop, with placement
        support as you level up.
      </p>
    </Card>
  ) : (
    <Card tone="deep" className="pop">
      <Eyebrow tone="lemon">Ready to level up?</Eyebrow>
      <p className="mt-2 text-[14.5px] leading-[1.5] text-white">
        Join the <b>TTS Community</b> for better job opportunities, <b>free
        training</b>, and job placement. We’ll help you close the gap to
        match-ready.
      </p>
      <button
        onClick={onJoin}
        disabled={busy}
        className="mt-[14px] flex w-full items-center justify-center gap-2 rounded-btn bg-lemon px-[18px] py-[15px] text-[15px] font-semibold text-deep disabled:opacity-45"
      >
        <GraduationCap size={16} /> Take action now
      </button>
    </Card>
  );

  return (
    <AppShell>
      {confetti && (
        <>
          {Array.from({ length: 42 }).map((_, i) => (
            <span
              key={i}
              className="conf"
              style={{
                left: `${(2 + (i * 2.3) % 96)}%`,
                background: CONF_COLORS[i % CONF_COLORS.length],
                animationDuration: `${1.5 + (i % 5) * 0.28}s`,
                animationDelay: `${(i % 8) * 0.04}s`,
              }}
            />
          ))}
        </>
      )}

      {screen === "intro" && (
        <div className="flex min-h-[70vh] flex-col">
          <Eyebrow>{mode === "practice" ? "Practice · unscored" : "Live · scored"}</Eyebrow>
          <h1 className="mt-2 font-display text-[30px] font-extrabold text-deep">
            {skillName}
          </h1>
          <p className="mt-3 text-[14px] leading-[1.5] text-muted">
            Four timed levels, 3 questions each — clear 2 of 3 to advance.{" "}
            {mode === "practice"
              ? "Practice runs don’t count and never appear on the leaderboard."
              : "This is your one scored run for this skill this week."}
          </p>
          {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}
          <div className="mt-auto pt-8">
            <Button onClick={start}>
              <Sparkles size={16} /> Start {mode === "practice" ? "practice" : ""}
            </Button>
            <Link
              href={mode === "practice" ? `/play/${skillId}` : `/play/${skillId}?mode=practice`}
              className="mt-3 block text-center text-[13px] font-semibold text-green underline"
            >
              {mode === "practice" ? "Switch to the scored run" : "Just practice instead"}
            </Link>
          </div>
          <Tagline />
        </div>
      )}

      {screen === "loading" && (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <Sparkles size={36} className="text-green" />
          <h2 className="mt-5 font-display text-[22px] font-extrabold text-deep">
            Preparing level {level}…
          </h2>
        </div>
      )}

      {screen === "play" && (
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-[5px] rounded-full bg-green-50 px-[10px] py-1 text-[11px] font-semibold text-deep">
              {skillName}
            </span>
            {mode === "practice" && (
              <span className="text-[10.5px] text-muted">practice</span>
            )}
          </div>
          <div className="my-[14px] flex gap-[6px]">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-[6px] flex-1 rounded ${
                  i < level ? "bg-green" : i === level ? "bg-lemon" : "bg-[#E4ECE7]"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-extrabold text-deep">
              Level {level} · {levelMeta?.name}
            </h2>
            <span className="rounded-full bg-lemon px-[10px] py-1 text-[11px] font-semibold text-deep">
              ≥2 of 3
            </span>
          </div>
          <div className="mt-[10px] flex items-center gap-[7px]">
            <Timer size={15} className={low ? "text-red" : "text-deep"} />
            <div className="h-[7px] flex-1 overflow-hidden rounded bg-[#E4ECE7]">
              <div
                className={`h-full rounded ${low ? "bg-red" : "bg-green"}`}
                style={{
                  width: `${levelMeta ? (timeLeft / levelMeta.time_seconds) * 100 : 0}%`,
                  transition: "width 1s linear",
                }}
              />
            </div>
            <span
              className={`min-w-[38px] text-right text-[13px] font-bold tabular-nums ${
                low ? "text-red" : "text-deep"
              }`}
            >
              {mm}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-5">
            {questions.map((q, qi) => (
              <div key={q.id}>
                <p className="mb-[11px] text-[15px] font-semibold leading-[1.4] text-deep">
                  {qi + 1}. {q.prompt}
                </p>
                <div className="flex flex-col gap-[9px]">
                  {q.options.map((op, oi) => {
                    const selected = answers[qi] === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          const a = [...answers];
                          a[qi] = oi;
                          setAnswers(a);
                        }}
                        className={`flex items-center gap-[11px] rounded-[13px] border-[1.5px] px-[15px] py-[14px] text-left text-[14.5px] leading-[1.35] transition ${
                          selected
                            ? "border-green bg-green-50"
                            : "border-[#DCE6E0] bg-white hover:border-green"
                        }`}
                      >
                        <span
                          className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                            selected
                              ? "border-green bg-green text-white"
                              : "border-[#C9D6CE] text-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span>{op}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}
          <Button className="mt-[22px]" disabled={!allAnswered} onClick={submit}>
            Submit level {level}
          </Button>
        </div>
      )}

      {screen === "graded" && graded && (
        <div className="flash">
          <Card tone={graded.passed ? "wash" : "cream"} className="mb-3">
            <div className="flex items-center gap-2">
              {graded.passed ? (
                <Sparkles size={16} className="text-green" />
              ) : (
                <Timer size={16} className="text-deep" />
              )}
              <span className="text-[14px] font-bold text-deep">
                {graded.passed
                  ? `Level ${level} cleared!`
                  : graded.timedOut
                    ? "Time’s up."
                    : "Not quite."}{" "}
                {graded.correctCount}/{questions.length}
              </span>
            </div>
            {!graded.passed && (
              <p className="mt-[6px] text-[12.5px] text-muted">
                You need 2 of 3. This is where your worth is set — honestly.
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            {questions.map((q, qi) => {
              const pq = graded.perQuestion[qi];
              return (
                <div key={q.id}>
                  <p className="mb-2 text-[14px] font-semibold leading-[1.4] text-deep">
                    {qi + 1}. {q.prompt}
                  </p>
                  <div className="flex flex-col gap-[7px]">
                    {q.options.map((op, oi) => {
                      const isCorrect = oi === pq.correctIndex;
                      const isWrongPick = answers[qi] === oi && !isCorrect;
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-[11px] rounded-[13px] border-[1.5px] px-[15px] py-[12px] text-[14px] ${
                            isCorrect
                              ? "border-green bg-green-50"
                              : isWrongPick
                                ? "border-red bg-[#FCE5E2]"
                                : "border-[#DCE6E0] bg-white"
                          }`}
                        >
                          <span
                            className={`flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full text-white ${
                              isCorrect ? "bg-green" : isWrongPick ? "bg-red" : "bg-[#C9D6CE]"
                            }`}
                          >
                            {isCorrect ? <Check size={12} /> : isWrongPick ? <X size={12} /> : ""}
                          </span>
                          <span>{op}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="dark" className="mt-5" onClick={proceed}>
            {graded.passed && graded.nextLevel && !graded.terminal ? (
              <>
                Next level <ChevronRight size={17} />
              </>
            ) : (
              <>
                See what I’m worth <ArrowRight size={17} />
              </>
            )}
          </Button>
        </div>
      )}

      {screen === "reveal" && (
        <div>
          <Card tone="deep" className="pop">
            <Eyebrow tone="lemon">Your worth, proven</Eyebrow>
            <div className="mt-2 font-display text-[20px] font-extrabold text-white">
              {skillName}
            </div>
            {reveal && reveal.reachedLevel >= 1 ? (
              <>
                <div className="mt-[10px] font-display text-[36px] font-extrabold leading-none text-lemon">
                  {reveal.nairaLow != null && reveal.nairaHigh != null
                    ? `₦${Math.round(reveal.nairaLow / 1000)}k–${Math.round(reveal.nairaHigh / 1000)}k`
                    : reveal.bandLabel}
                </div>
                <p className="mt-[10px] text-[13px] text-white/80">
                  Reached level <b className="text-white">{reveal.reachedLevel}</b>{" "}
                  · Tier <b className="text-white">{reveal.tier}</b>
                  {reveal.bandLabel ? (
                    <>
                      {" "}
                      · <b className="text-white">{reveal.bandLabel}</b>
                    </>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="mt-[10px] text-[13px] text-white/80">
                {mode === "practice"
                  ? "Practice complete — no score recorded."
                  : "Your foundations are showing. Here’s an honest route up."}
              </p>
            )}
          </Card>

          <div className="mt-4">
            <Eyebrow>Your climb</Eyebrow>
            {[1, 2, 3, 4].map((lv) => {
              const r = climb.find((c) => c.level === lv);
              return (
                <div
                  key={lv}
                  className="flex items-center justify-between border-b border-[#EEF3F0] py-2"
                >
                  <span className="flex items-center gap-[9px]">
                    <span
                      className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[13px] font-bold ${
                        r?.passed ? "bg-green text-white" : "bg-green-50 text-deep"
                      }`}
                    >
                      {lv}
                    </span>
                    <span className="text-[13.5px] font-semibold text-deep">
                      {levels.find((l) => l.level === lv)?.name ?? `Level ${lv}`}
                    </span>
                  </span>
                  <span className="text-[12.5px] text-muted">
                    {r ? `${r.correctCount}/3` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}

          {mode === "scored" ? (
            <div className="mt-5 flex gap-[10px]">
              <Button className="flex-1" disabled={busy} onClick={onAccept}>
                <Check size={16} /> Accept
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                disabled={busy}
                onClick={() => setScreen("dispute")}
              >
                <ShieldQuestion size={16} /> Dispute
              </Button>
            </div>
          ) : (
            <div className="mt-5">{proveAnother}</div>
          )}
          <Tagline />
        </div>
      )}

      {screen === "dispute" && (
        <div>
          <Eyebrow>Not your full worth?</Eyebrow>
          <h2 className="mt-2 font-display text-[26px] font-extrabold text-deep">
            Dispute it.
          </h2>
          <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
            Two ways to challenge your band. Prove more, or ask a person to review
            it.
          </p>

          {reachedLevel < 4 && (
            <Card tone="wash" className="mt-[18px]">
              <Eyebrow tone="deep">Prove more</Eyebrow>
              <p className="mt-[7px] text-[13.5px] leading-[1.45] text-ink">
                Take on <b>Level {reachedLevel + 1}</b> (timed). Clear it and your
                band moves up on the spot.
              </p>
              <button
                onClick={onReprove}
                disabled={busy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-btn bg-deep px-[18px] py-[14px] text-[15px] font-semibold text-lemon disabled:opacity-45"
              >
                <RotateCcw size={15} /> Attempt level {reachedLevel + 1}
              </button>
            </Card>
          )}

          <Card tone="plain" className="mt-[14px]">
            <Eyebrow>Ask for a human review</Eyebrow>
            <p className="mt-[7px] text-[13px] leading-[1.45] text-muted">
              Tell the calibration team why the result is off. Your current band
              stands until they review.
            </p>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="e.g. The questions didn’t cover my main tools…"
              className="mt-[10px] min-h-[74px] w-full resize-none rounded-field border-[1.5px] border-[#DCE6E0] p-3 text-[14px] outline-none focus:border-green"
            />
            <button
              onClick={onReview}
              disabled={busy || !disputeNote.trim()}
              className="mt-[10px] flex w-full items-center justify-center gap-2 rounded-btn border-[1.5px] border-green bg-white px-[18px] py-[14px] text-[15px] font-semibold text-deep disabled:opacity-45"
            >
              Send to calibration team
            </button>
          </Card>

          {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}
          <Button variant="lemon" className="mt-4" disabled={busy} onClick={onAccept}>
            Actually, I’ll accept it
          </Button>
        </div>
      )}

      {screen === "reviewed" && (
        <div className="flex min-h-[70vh] flex-col justify-center">
          <Card tone="wash" className="pop">
            <Eyebrow tone="deep">Dispute logged</Eyebrow>
            <h2 className="mt-2 font-display text-[24px] font-extrabold text-deep">
              A person will look at this.
            </h2>
            <p className="mt-[10px] text-[13.5px] leading-[1.5] text-ink">
              Your note is flagged to the calibration team. You’ll hear back by
              email. Until then, your current band stands.
            </p>
          </Card>
          <Button className="mt-5" disabled={busy} onClick={onAccept}>
            Continue <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {screen === "accepted" && accepted && (
        <div>
          <Card tone="deep" className="pop">
            <Eyebrow tone="lemon">Locked in · Tier {accepted.tier}</Eyebrow>
            {reveal && reveal.reachedLevel >= 1 && reveal.nairaLow != null ? (
              <div className="mt-2 font-display text-[34px] font-extrabold leading-none text-lemon">
                ₦{Math.round(reveal.nairaLow / 1000)}k–
                {Math.round((reveal.nairaHigh ?? 0) / 1000)}k
              </div>
            ) : null}
            <p className="mt-2 text-[13px] text-white/80">
              {reveal?.bandLabel ?? "Emerging"} · {skillName}
            </p>
          </Card>

          <Card tone="wash" className="mt-[14px]">
            <Eyebrow tone="deep">Your next step</Eyebrow>
            <p className="mt-2 text-[14px] font-semibold leading-[1.5] text-deep">
              {doorFor(accepted.tier)}.
            </p>
          </Card>

          {accepted.tier === "A" ? (
            <Card tone="cream" className="mt-3">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-deep" />
                <span className="text-[14px] font-bold text-deep">
                  You’re Tier A — match-ready 🎉
                </span>
              </div>
              <p className="mt-[6px] text-[12.5px] text-muted">
                We’ve routed you to QTP for matching. Friday’s raffle auto-entry
                (Level 3+) arrives in <b>M4</b>.
              </p>
            </Card>
          ) : (
            <div className="mt-3">{communityCTA}</div>
          )}

          <div className="mt-5">{proveAnother}</div>
          <Tagline />
        </div>
      )}

      {screen === "blocked" && (
        <div className="flex min-h-[70vh] flex-col justify-center">
          <Card tone="cream" className="pop">
            <Eyebrow tone="deep">One run per week</Eyebrow>
            <h2 className="mt-2 font-display text-[24px] font-extrabold text-deep">
              Already proven.
            </h2>
            <p className="mt-[10px] text-[13.5px] leading-[1.5] text-ink">{error}</p>
          </Card>
          <div className="mt-5 flex flex-col gap-3">
            <Link
              href={`/play/${skillId}?mode=practice`}
              className="flex w-full items-center justify-center gap-2 rounded-btn bg-deep px-[18px] py-[15px] text-[15px] font-semibold text-lemon"
            >
              Practice this skill instead
            </Link>
            <Link
              href="/skills"
              className="flex w-full items-center justify-center gap-2 rounded-btn border-[1.5px] border-green bg-white px-[18px] py-[15px] text-[15px] font-semibold text-deep"
            >
              Pick another skill
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
