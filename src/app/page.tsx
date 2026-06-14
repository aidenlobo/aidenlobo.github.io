"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useGameState, type Question, type Team } from "@/hooks/useGameState";

/* ─────────────────────────────────────────────
   Fisher-Yates shuffle — used to randomize multiple-choice
   option order on each new question, independent of how the
   "correct" answer was authored in the seed data.
───────────────────────────────────────────── */
function shuffleOptions<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ─────────────────────────────────────────────
   Aiden's Coog Championship — TV Board (read-only)

   This page is built to live on a single TV screen.
   The root is locked to h-screen / w-screen / overflow-hidden,
   and every interior region uses flex-1 + min-h-0 with `1fr`
   grid tracks and viewport-relative (vh / vw / vmin) font sizes,
   so the layout scales proportionally on any panel — 720p, 1080p,
   or 4K — without ever producing a scrollbar.
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Persistent header — UH logo + live team scores
───────────────────────────────────────────── */
function ScoreHeader({ teams }: { teams: Record<string, Team> | null }) {
  const teamEntries = teams ? Object.entries(teams) : [];
  const sorted = [...teamEntries].sort(([, a], [, b]) => b.score - a.score);
  const leadScore = sorted.length ? sorted[0][1].score : 0;

  return (
    <header className="flex shrink-0 items-center justify-between gap-[2vw] border-b border-uh-scarlet/30 bg-uh-charcoal-light px-[2vw] py-[1.2vh] shadow-lg">
      {/* Brand */}
      <div className="flex shrink-0 items-center gap-[1.2vw]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/uh-logo.jpg"
          alt="University of Houston"
          className="aspect-square h-[8vh] w-auto rounded-md object-cover shadow-md"
        />
        <span
          className="hidden uppercase leading-none text-uh-scarlet sm:inline"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1rem, 3vh, 2.4rem)",
            letterSpacing: "0.04em",
          }}
        >
          Aiden&apos;s Coog Championship
        </span>
      </div>

      {/* Live scoreboard */}
      <div className="flex min-w-0 flex-1 items-stretch justify-end gap-[1vw] overflow-hidden">
        {sorted.length === 0 ? (
          <span
            className="self-center text-uh-silver"
            style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.7rem, 1.8vh, 1.1rem)" }}
          >
            Waiting for teams…
          </span>
        ) : (
          sorted.map(([teamId, team]) => {
            const isLeader = leadScore > 0 && team.score === leadScore;
            return (
              <div
                key={teamId}
                className={`flex min-w-0 flex-col items-center justify-center rounded-xl border px-[1.1vw] py-[0.5vh] transition-all duration-300 ${
                  isLeader
                    ? "border-uh-scarlet bg-uh-scarlet/15 shadow-[0_0_18px_rgba(200,16,46,0.35)]"
                    : "border-uh-silver/20 bg-uh-charcoal"
                }`}
              >
                <span
                  className="max-w-[16vw] truncate font-bold text-zinc-100"
                  style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.65rem, 1.8vh, 1.2rem)" }}
                >
                  {team.name}
                </span>
                <span
                  className={isLeader ? "text-uh-scarlet" : "text-uh-silver"}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.1rem, 3.4vh, 2.8rem)",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  {team.score}
                </span>
              </div>
            );
          })
        )}
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   Root — persistent header + routed body
───────────────────────────────────────────── */
export default function TVBoard() {
  const { gameState, teams, questions, loading } = useGameState();

  const currentQuestionId = gameState?.currentQuestionId ?? null;
  const currentQuestion =
    currentQuestionId && questions ? questions[currentQuestionId] ?? null : null;
  const status = gameState?.status ?? "lobby";

  /* The Final Jeopardy clue never appears as a board tile, so locate it
     directly here to surface during the 'final_answer' reveal phase. */
  const finalQuestion = questions
    ? Object.values(questions).find(
        (q) => q.type === "final_jeopardy" || q.category === "Final Jeopardy"
      ) ?? null
    : null;

  /* Final Jeopardy hijacks the entire screen — and deliberately hides the
     persistent scoreboard so the wager math stays suspenseful. */
  if (status === "final_wager" || status === "final_answer" || status === "final_scoring") {
    return (
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-uh-charcoal text-zinc-50">
        <FinalJeopardy
          status={status}
          answersLocked={gameState?.answersLocked ?? false}
          teams={teams}
          questionText={finalQuestion?.questionText ?? null}
        />
      </main>
    );
  }

  /* Podium — the grand finale. Final scores come from each team's
     Admin-confirmed finalCalculatedScore (Final Jeopardy result),
     falling back to their current score if Final Jeopardy was skipped. */
  if (status === "podium") {
    return (
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-uh-charcoal text-zinc-50">
        <Podium teams={teams} />
      </main>
    );
  }

  let body: React.ReactNode;
  if (loading) {
    body = <CenteredBanner>Connecting…</CenteredBanner>;
  } else if (currentQuestionId && currentQuestion) {
    body = (
      <ActiveQuestion
        question={currentQuestion}
        revealAnswer={gameState?.revealAnswer ?? false}
        selectedAnswer={gameState?.selectedAnswer ?? null}
      />
    );
  } else if (status === "welcome") {
    body = <Welcome />;
  } else if (status === "board") {
    body = <Board questions={questions} />;
  } else {
    body = <Lobby teams={teams} />;
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-uh-charcoal text-zinc-50">
      {/*if status not equal to wlecome, show the score header*/ }
      {status !== "welcome" && <ScoreHeader teams={teams} />}
      <TimerBar endsAt={gameState?.timerEndsAt ?? null} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
    </main>
  );
}

/* ─────────────────────────────────────────────
   Massive on-screen countdown — mirrors gameState.timerEndsAt, set by
   the Admin's "Start 15s Timer" button. Spans the full screen width as
   a shrinking bar; disappears once it hits zero.
───────────────────────────────────────────── */
const TIMER_DURATION_MS = 15000;

function TimerBar({ endsAt }: { endsAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt || endsAt <= now) return null;

  const remainingMs = endsAt - now;
  const pct = Math.max(0, Math.min(100, (remainingMs / TIMER_DURATION_MS) * 100));

  return (
    <div className="h-[1.4vh] w-full shrink-0 overflow-hidden bg-uh-charcoal-light">
      <div
        className="h-full bg-uh-scarlet shadow-[0_0_24px_rgba(200,16,46,0.6)] transition-all duration-100 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared: centered full-bleed banner
───────────────────────────────────────────── */
function CenteredBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-[4vw] text-center">
      <p
        className="animate-pulse uppercase leading-none text-uh-scarlet"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 9vh, 7rem)",
          letterSpacing: "0.05em",
        }}
      >
        {children}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Final Jeopardy — dramatic full-screen takeover
   Scores are intentionally hidden to preserve suspense.
───────────────────────────────────────────── */
function FinalJeopardy({
  status,
  answersLocked,
  teams,
  questionText,
}: {
  status: "final_wager" | "final_answer" | "final_scoring";
  answersLocked: boolean;
  teams: Record<string, Team> | null;
  questionText: string | null;
}) {
  const teamEntries = teams ? Object.entries(teams) : [];
  const total = teamEntries.length;
  const answered = teamEntries.filter(
    ([, t]) => (t.finalAnswer ?? "").trim().length > 0
  ).length;

  let headline: string;
  let sub: string;
  if (status === "final_wager") {
    headline = "Place Your Wagers";
    sub = "Captains, decide how much you're willing to risk.";
  } else if (status === "final_scoring") {
    headline = "Tallying Scores";
    sub = "The host is reviewing each team's final answer.";
  } else if (answersLocked) {
    headline = "Answers Locked";
    sub = "Pencils down. Let's see what you've got.";
  } else {
    headline = "Submit Your Answer";
    sub = "Captains, enter your final answer on your phone.";
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-[5vw] text-center">
      {/* Ambient pulsing glow */}
      <div
        className="pointer-events-none absolute inset-0 animate-pulse opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, #c8102e, transparent)",
        }}
      />

      {/* Eyebrow */}
      <p
        className="text-uh-silver"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.7rem, 2vh, 1.3rem)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.6em",
        }}
      >
        And now…
      </p>

      {/* Hero title */}
      <h1
        className="title-shimmer mt-[1.5vh] uppercase leading-none"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 15vh, 12rem)",
          letterSpacing: "0.04em",
        }}
      >
        Final Jeopardy
      </h1>

      <div className="welcome-bar mt-[3vh] w-[28vw]" />

      {/* Phase headline */}
      <p
        className={`mt-[4vh] uppercase leading-none ${
          answersLocked ? "text-emerald-400" : "text-uh-scarlet"
        }`}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.8rem, 7vh, 5rem)",
          letterSpacing: "0.05em",
        }}
      >
        {headline}
      </p>

      <p
        className="mt-[2vh] max-w-[70vw] text-uh-silver"
        style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.6vh, 1.8rem)" }}
      >
        {sub}
      </p>

      {/* The Final Jeopardy clue — shown once answers are open so the audience
          can read along while captains type their responses. */}
      {status === "final_answer" && questionText && (
        <div className="mt-[4vh] max-w-[78vw] rounded-2xl border-2 border-amber-400/50 bg-amber-400/5 px-[3vw] py-[3vh] shadow-[0_0_30px_rgba(251,191,36,0.18)]">
          <p
            className="font-bold leading-snug text-zinc-50"
            style={{ fontFamily: "var(--font-body)", fontSize: "clamp(1.1rem, 4vh, 2.8rem)" }}
          >
            {questionText}
          </p>
        </div>
      )}

      {/* Anticipation meter — counts submissions without revealing scores */}
      {status === "final_answer" && total > 0 && (
        <p
          className="mt-[4vh] text-zinc-300"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.2rem, 4vh, 2.6rem)", letterSpacing: "0.08em" }}
        >
          <span className={answered === total ? "text-emerald-400" : "text-uh-scarlet"}>
            {answered}
          </span>{" "}
          / {total} captains locked in
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Welcome
───────────────────────────────────────────── */
function Welcome() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-[4vw] text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, #c8102e, transparent)",
        }}
      />
      <p
        className="text-uh-silver"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.8rem, 2vh, 1.3rem)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.55em",
        }}
      >
        Welcome to
      </p>
      <h1
        className="title-shimmer mt-[2vh] uppercase leading-none"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 14vh, 11rem)",
          letterSpacing: "0.04em",
          animationDuration: "8s",
        }}
      >
        Aiden&apos;s Graduation Party
      </h1>
      <div className="welcome-bar mt-[3vh] w-[24vw]" style={{ animationDuration: "5.6s" }} />
      <p
        className="mt-[2.5vh] text-uh-silver"
        style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.4vh, 1.6rem)" }}
      >
        Come celebrate with us
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Lobby — join QR + checked-in teams
───────────────────────────────────────────── */
function Lobby({ teams }: { teams: Record<string, Team> | null }) {
  const teamEntries = teams ? Object.entries(teams) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[3vw] py-[2.5vh]">
      <header className="shrink-0 text-center">
        <h1
          className="uppercase leading-none text-uh-scarlet"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 7vh, 5.5rem)",
            letterSpacing: "0.03em",
          }}
        >
          Scan to Join the Game
        </h1>
        <div className="mx-auto mt-[1vh] h-0.5 w-[14vw] bg-uh-scarlet/60" />
      </header>

      <div className="mt-[2.5vh] grid min-h-0 flex-1 grid-cols-1 gap-[2vw] lg:grid-cols-2">
        {/* QR */}
        <section className="flex min-h-0 flex-col items-center justify-center gap-[2vh] rounded-2xl border border-uh-silver/20 bg-uh-charcoal-light p-[2vh]">
          <div className="rounded-xl bg-white p-[1.5vh] shadow-[0_0_30px_rgba(200,16,46,0.15)]">
            <QRCodeSVG value="https://aidengraduationgame.vercel.app/join" className="h-[26vh] w-[26vh]" />
          </div>
          <p
            className="max-w-[28vw] text-uh-silver"
            style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.8rem, 2vh, 1.3rem)" }}
          >
            Grab your phone, scan the code, and register your team.
          </p>
        </section>

        {/* Teams */}
        <section className="flex min-h-0 flex-col gap-[1.5vh] rounded-2xl border border-uh-silver/20 bg-uh-charcoal-light p-[2vh]">
          <h2
            className="shrink-0 uppercase tracking-[0.2em] text-uh-silver"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem, 2.6vh, 1.8rem)" }}
          >
            Teams Checked In
          </h2>
          {teamEntries.length === 0 ? (
            <p
              className="text-uh-silver"
              style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.8rem, 2vh, 1.2rem)" }}
            >
              No teams yet. Be the first to scan and join!
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-[1.2vh] overflow-hidden sm:grid-cols-2">
              {teamEntries.map(([teamId, team]) => (
                <div
                  key={teamId}
                  className="rounded-xl border border-uh-silver/20 bg-uh-charcoal p-[1.5vh] shadow-md"
                >
                  <p
                    className="truncate font-bold text-zinc-50"
                    style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.2vh, 1.5rem)" }}
                  >
                    {team.name}
                  </p>
                  <p
                    className="mt-0.5 truncate font-semibold uppercase tracking-widest text-uh-scarlet"
                    style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.6rem, 1.5vh, 0.9rem)" }}
                  >
                    Captain: {team.captain}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Board — category × points grid (read-only)
───────────────────────────────────────────── */
function Board({ questions }: { questions: Record<string, Question> | null }) {
  // Group by category, preserving the database's insertion order.
  const categoryOrder: string[] = [];
  const grouped: Record<string, Question[]> = {};

  if (questions) {
    for (const question of Object.values(questions)) {
      if (question.type === "final_jeopardy" || question.category === "Final Jeopardy") {
        continue;
      }
      if (!grouped[question.category]) {
        grouped[question.category] = [];
        categoryOrder.push(question.category);
      }
      grouped[question.category].push(question);
    }
  }

  const categories = categoryOrder.map((category) => ({
    category,
    questions: [...grouped[category]].sort((a, b) => a.points - b.points),
  }));

  if (categories.length === 0) {
    return <CenteredBanner>Game Starting…</CenteredBanner>;
  }

  const cols = categories.length;
  const rows = Math.max(...categories.map((c) => c.questions.length));

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[1.5vw] py-[1.5vh]">
      <div
        className="grid min-h-0 flex-1 gap-[0.9vw]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {/* Row 0 — category headers */}
        {categories.map(({ category }) => (
          <div
            key={`header-${category}`}
            className="flex items-center justify-center rounded-xl bg-uh-scarlet px-[0.5vw] py-[1.2vh] text-center shadow-lg"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.7rem, 2.2vh, 1.7rem)",
              letterSpacing: "0.06em",
              color: "#f4f4f5",
            }}
          >
            {category}
          </div>
        ))}

        {/* Rows 1…N — point tiles, rendered row-by-row */}
        {Array.from({ length: rows }, (_, rowIdx) =>
          categories.map(({ category, questions: catQuestions }) => {
            const question = catQuestions[rowIdx];
            if (!question) {
              return <div key={`empty-${category}-${rowIdx}`} />;
            }
            return (
              <div
                key={`${category}-${rowIdx}`}
                className={`flex items-center justify-center rounded-xl border text-center transition-all duration-300 ${
                  question.isAnswered
                    ? "border-zinc-800/40 bg-zinc-900/40 opacity-30"
                    : "border-uh-scarlet/30 bg-uh-charcoal-light text-uh-silver"
                }`}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.3rem, 6vh, 4rem)",
                  letterSpacing: "0.04em",
                }}
              >
                <span className={question.isAnswered ? "invisible" : undefined}>
                  {question.points}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Active Question — read-only display
───────────────────────────────────────────── */
function ActiveQuestion({
  question,
  revealAnswer,
  selectedAnswer,
}: {
  question: Question;
  revealAnswer: boolean;
  selectedAnswer: string | null;
}) {
  const correctAnswer = question.correctAnswer ?? question.answerText;
  const rawOptions = question.options ?? [];

  // Shuffle multiple-choice options once per question, not on every
  // re-render, so the order doesn't jump around as the host reveals answers.
  const options = useMemo(
    () => (question.type === "multiple_choice" ? shuffleOptions(rawOptions) : rawOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.questionText, question.type]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[4vw] py-[3vh]">
      {/* Category / points */}
      <p
        className="shrink-0 text-center uppercase text-uh-scarlet"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 3vh, 2rem)",
          letterSpacing: "0.45em",
        }}
      >
        {question.category}&nbsp;-&nbsp;{question.points}&nbsp;pts
      </p>

      {/* Question text */}
      <div className="flex min-h-0 shrink-0 items-center justify-center py-[2vh]">
        <h1
          className="mx-auto max-w-[88vw] text-center font-bold leading-snug tracking-tight text-zinc-50"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(1.4rem, 5.5vh, 4rem)",
          }}
        >
          {question.questionText}
        </h1>
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div
          className="grid min-h-0 flex-1 gap-[1.5vh] sm:gap-[1.5vw]"
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: `repeat(${Math.ceil(options.length / 2)}, minmax(0, 1fr))`,
          }}
        >
          {options.map((option) => {
            const isCorrect = option === correctAnswer;
            const isSelected = option === selectedAnswer;

            let style =
              "border-uh-silver/25 bg-uh-charcoal-light text-zinc-100";
            if (isSelected) {
              style = isCorrect
                ? "border-emerald-400 bg-emerald-500/90 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                : "border-rose-400 bg-rose-500/90 text-zinc-950 shadow-[0_0_20px_rgba(225,29,72,0.4)]";
            } else if (revealAnswer && isCorrect) {
              style =
                "border-emerald-400 bg-emerald-500/90 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]";
            }

            return (
              <div
                key={option}
                className={`flex items-center justify-center rounded-2xl border-2 p-[2vh] text-center transition-all duration-300 ${style}`}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1rem, 3vh, 2rem)",
                  fontWeight: 700,
                }}
              >
                {option}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Family Feud reveal board ── a strict vertical list of numbered
          slots. Each slot shows its answer text once the Admin toggles its
          index in question.revealedAnswers; until then it's a blank box
          (these questions have no options grid). */}
      {question.type === "family_feud" &&
        question.topAnswers &&
        question.topAnswers.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-[1.2vh]">
            {question.topAnswers.map((answer, index) => {
              const isRevealed = question.revealedAnswers?.[index] ?? false;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-[1.5vw] rounded-2xl border-2 px-[2vw] py-[1.6vh] transition-all duration-300 ${
                    isRevealed
                      ? "border-emerald-400 bg-emerald-500/90 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                      : "border-uh-silver/25 bg-uh-charcoal-light text-uh-silver"
                  }`}
                >
                  <span
                    className="flex shrink-0 items-center justify-center rounded-lg bg-black/10"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.2rem, 3.5vh, 2.2rem)",
                      width: "2.2em",
                      height: "1.4em",
                      lineHeight: 1,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span
                    className="font-bold"
                    style={{ fontFamily: "var(--font-body)", fontSize: "clamp(1rem, 3vh, 2rem)" }}
                  >
                    {isRevealed ? answer : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      {/* ── Text-answer reveal ── for fill-in-the-blank and audio/lyric clues,
          which have no options to highlight; show the answer text outright. */}
      {revealAnswer &&
        (question.type === "fill_blank" || question.type === "audio_lyric") &&
        correctAnswer && (
          <div className="flex min-h-0 flex-1 items-center justify-center py-[2vh]">
            <p
              className="mx-auto max-w-[80vw] rounded-2xl border-2 border-emerald-400 bg-emerald-500/90 px-[3vw] py-[3vh] text-center font-bold leading-snug text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.4rem, 5vh, 3.5rem)",
              }}
            >
              {correctAnswer}
            </p>
          </div>
        )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Podium — Phase 4 grand finale

   Final score = each team's Admin-confirmed finalCalculatedScore (falling
   back to current score). Teams are ranked with standard competition
   placement, so equal scores share a place ("Tied for 2nd Place"), and the
   results are unveiled bottom-up — last place first, climbing to 1st — with
   a 3-second beat between reveals, a drumroll before the champion, and a
   cheer the moment they're shown.
───────────────────────────────────────────── */
interface PodiumEntry {
  teamId: string;
  name: string;
  finalScore: number;
  /** Standard competition placement (1-based); tied teams share a place. */
  place: number;
  /** True when at least one other team shares this exact score. */
  tied: boolean;
}

const REVEAL_INTERVAL_MS = 3000;

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 21 → "21st", … */
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Fire-and-forget sound cue. Autoplay rejections are swallowed silently. */
function playCue(src: string) {
  if (typeof Audio === "undefined") return;
  try {
    const audio = new Audio(src);
    void audio.play().catch(() => {
      /* browser blocked autoplay — nothing we can do on a TV board */
    });
  } catch {
    /* Audio unavailable — ignore */
  }
}

const PLACE_ACCENTS: Record<number, { border: string; bg: string; text: string }> = {
  1: { border: "border-amber-400", bg: "bg-amber-400/20", text: "text-amber-300" },
  2: { border: "border-uh-silver", bg: "bg-uh-silver/15", text: "text-uh-silver" },
  3: { border: "border-orange-600", bg: "bg-orange-600/15", text: "text-orange-400" },
};
const DEFAULT_ACCENT = {
  border: "border-uh-silver/25",
  bg: "bg-uh-charcoal-light",
  text: "text-zinc-300",
};

function Podium({ teams }: { teams: Record<string, Team> | null }) {
  // Rank descending by final score, then assign standard competition
  // placements so equal scores share a place and the next distinct score
  // skips ahead (e.g. 1, 2, 2, 4).
  const ranked: PodiumEntry[] = useMemo(() => {
    const base = (teams ? Object.entries(teams) : []).map(([teamId, team]) => ({
      teamId,
      name: team.name,
      finalScore: team.finalCalculatedScore ?? team.score,
    }));
    base.sort((a, b) => b.finalScore - a.finalScore);
    return base.map((entry) => ({
      ...entry,
      place: 1 + base.filter((e) => e.finalScore > entry.finalScore).length,
      tied: base.filter((e) => e.finalScore === entry.finalScore).length > 1,
    }));
  }, [teams]);

  const total = ranked.length;

  /* Distinct final scores, ascending — the reveal advances one group per
     tick rather than one row per tick, so teams tied on score share a
     `revealedCount` step and land on screen simultaneously. Index 0 is
     the lowest score (revealed first); the last index is 1st place. */
  const scoreGroups = useMemo(() => {
    const distinct = Array.from(new Set(ranked.map((entry) => entry.finalScore)));
    distinct.sort((a, b) => a - b);
    return distinct;
  }, [ranked]);

  const totalGroups = scoreGroups.length;

  /* Staggered reveal: `revealedCount` counts how many score groups (from
     the lowest) are currently shown. It climbs from 0 to `totalGroups`,
     one every 3s, so the bottom of the board fills first and the
     champion lands last. */
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (totalGroups === 0 || revealedCount >= totalGroups) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // The next tick unveils 1st place — no sound cues configured.

    timers.push(
      setTimeout(() => setRevealedCount((count) => count + 1), REVEAL_INTERVAL_MS)
    );

    return () => timers.forEach(clearTimeout);
  }, [revealedCount, totalGroups]);

  // Celebrate the instant the champion (1st place) is on screen. (no audio)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-[4vw] py-[3vh] text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 35%, #c8102e, transparent)",
        }}
      />

      <p
        className="text-uh-silver"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.7rem, 2vh, 1.3rem)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.6em",
        }}
      >
        Final Results
      </p>

      <h1
        className="title-shimmer mt-[1vh] uppercase leading-none"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 10vh, 7rem)",
          letterSpacing: "0.04em",
        }}
      >
        Champions
      </h1>

      <div className="welcome-bar mt-[2vh] w-[24vw]" />

      {total === 0 ? (
        <p
          className="mt-[6vh] text-uh-silver"
          style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.6vh, 1.6rem)" }}
        >
          No teams to rank yet.
        </p>
      ) : (
        <div className="mt-[3vh] flex min-h-0 w-full max-w-[62vw] flex-1 flex-col justify-center gap-[1.2vh] overflow-hidden">
          {ranked.map((entry) => (
            <PodiumRow
              key={entry.teamId}
              entry={entry}
              // Revealed once its score group has been unveiled — ties share a group.
              revealed={scoreGroups.indexOf(entry.finalScore) < revealedCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PodiumRow({ entry, revealed }: { entry: PodiumEntry; revealed: boolean }) {
  const accent = PLACE_ACCENTS[entry.place] ?? DEFAULT_ACCENT;
  const isChampion = entry.place === 1;
  const placeLabel = entry.tied
    ? `Tied for ${ordinal(entry.place)} Place`
    : `${ordinal(entry.place)} Place`;

  return (
    <div
      className={`flex items-center justify-between gap-[2vw] rounded-2xl border-2 px-[2.5vw] transition-all duration-700 ${
        revealed ? `${accent.border} ${accent.bg}` : "border-uh-silver/15 bg-uh-charcoal/60"
      } ${
        isChampion
          ? "py-[2.4vh] shadow-[0_0_40px_rgba(251,191,36,0.3)]"
          : "py-[1.4vh]"
      }`}
    >
      {/* Placement + team name */}
      <div className="flex min-w-0 items-center gap-[1.5vw]">
        <span
          className={revealed ? accent.text : "text-uh-silver/40"}
          style={{
            fontFamily: "var(--font-display)",
            fontSize:
              isChampion && revealed ? "clamp(2rem, 7vh, 5rem)" : "clamp(1.4rem, 4.5vh, 3rem)",
            lineHeight: 1,
          }}
        >
          {revealed ? entry.place : "?"}
        </span>
        <div className="flex min-w-0 flex-col items-start">
          <span
            className="max-w-[36vw] truncate font-bold text-zinc-50"
            style={{
              fontFamily: "var(--font-body)",
              fontSize:
                isChampion && revealed
                  ? "clamp(1.2rem, 3.6vh, 2.6rem)"
                  : "clamp(0.9rem, 2.6vh, 1.7rem)",
            }}
          >
            {revealed ? `${isChampion ? "👑 " : ""}${entry.name}` : "???"}
          </span>
          <span
            className={`uppercase tracking-widest ${revealed ? accent.text : "text-uh-silver/40"}`}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.55rem, 1.5vh, 0.95rem)",
              fontWeight: 700,
            }}
          >
            {revealed ? placeLabel : "Awaiting reveal"}
          </span>
        </div>
      </div>

      {/* Final score */}
      <span
        className={revealed ? accent.text : "text-uh-silver/30"}
        style={{
          fontFamily: "var(--font-display)",
          fontSize:
            isChampion && revealed ? "clamp(1.8rem, 6vh, 4rem)" : "clamp(1.2rem, 4vh, 2.6rem)",
          lineHeight: 1,
        }}
      >
        {revealed ? entry.finalScore : "—"}
      </span>
    </div>
  );
}
