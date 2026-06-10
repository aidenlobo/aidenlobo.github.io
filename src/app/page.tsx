"use client";

import { QRCodeSVG } from "qrcode.react";
import { useGameState, type Question } from "@/hooks/useGameState";

/* ─────────────────────────────────────────────
   Shared UI: UH typographic badge
   A pulsing scarlet square with bold white "UH"
───────────────────────────────────────────── */
function UHBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`uh-badge select-none ${className}`}
      aria-label="University of Houston"
    >
      UH
    </div>
  );
}

/* ─────────────────────────────────────────────
   Root page — routes to the correct view
───────────────────────────────────────────── */
export default function Home() {
  const { gameState, teams, questions } = useGameState();

  const currentQuestionId = gameState?.currentQuestionId ?? null;
  const currentQuestion =
    currentQuestionId && questions ? questions[currentQuestionId] ?? null : null;

  if (currentQuestionId && currentQuestion) {
    return (
      <ActiveQuestion
        question={currentQuestion}
        revealAnswer={gameState?.revealAnswer ?? false}
        selectedAnswer={gameState?.selectedAnswer ?? null}
      />
    );
  }

  if (gameState?.status === "welcome") {
    return <Welcome />;
  }

  if (gameState?.status === "board") {
    return <Board questions={questions} />;
  }

  return <Lobby teams={teams} />;
}

/* ─────────────────────────────────────────────
   Welcome Screen
───────────────────────────────────────────── */
function Welcome() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, #c8102e, transparent)",
        }}
      />

      {/* UH badge — top-left */}
      <div className="absolute top-6 left-6">
        <UHBadge />
      </div>

      {/* Eyebrow label */}
      <p
        className="text-sm font-semibold uppercase tracking-[0.55em] text-uh-silver sm:text-base"
        style={{ fontFamily: "var(--font-body)" }}
      >
        You&apos;re Invited
      </p>

      {/* Hero title — Bebas Neue, shimmer gradient */}
      <h1
        className="title-shimmer mt-5 leading-none uppercase"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3.5rem, 10vw, 9rem)",
          letterSpacing: "0.04em",
        }}
      >
        Aiden&apos;s&nbsp;Coog
        <br />
        Jeopardy
        <br />
        Championship
      </h1>

      {/* Scarlet accent bar — thick, pulsing */}
      <div className="welcome-bar mt-8 w-48 sm:w-72" />

      {/* Subtext */}
      <p
        className="mt-6 text-base text-uh-silver sm:text-lg"
        style={{ fontFamily: "var(--font-body)" }}
      >
        University of Houston · Graduation 2026
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Lobby Screen
───────────────────────────────────────────── */
interface LobbyProps {
  teams: Record<string, { name: string; captain: string }> | null;
}

function Lobby({ teams }: LobbyProps) {
  const teamEntries = teams ? Object.entries(teams) : [];

  return (
    <div className="relative flex flex-1 flex-col bg-uh-charcoal px-6 py-10 text-zinc-50 sm:px-12">
      {/* UH badge — top-right */}
      <div className="absolute top-6 right-6">
        <UHBadge />
      </div>

      <header className="text-center">
        <h1
          className="uppercase leading-none text-uh-scarlet"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.8rem, 8vw, 7rem)",
            letterSpacing: "0.03em",
          }}
        >
          Welcome to Aiden&apos;s Graduation
        </h1>
        <div className="mx-auto mt-4 h-0.5 w-48 bg-uh-scarlet/60" />
      </header>

      <div className="mt-10 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-2">
        {/* QR Code section */}
        <section className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-uh-silver/20 bg-uh-charcoal-light p-8 text-center transition-all duration-300 ease-in-out hover:border-uh-scarlet/40">
          <h2
            className="uppercase tracking-[0.2em] text-uh-silver"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}
          >
            Scan to Join
          </h2>
          <div className="rounded-xl bg-white p-5 shadow-[0_0_30px_rgba(200,16,46,0.15)]">
            <QRCodeSVG value="/join" size={220} />
          </div>
          <p
            className="max-w-sm text-base text-zinc-400 sm:text-lg"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Grab your phone, scan the code, and register your team to get in on
            the action.
          </p>
        </section>

        {/* Teams section */}
        <section className="flex flex-col gap-4 rounded-2xl border border-uh-silver/20 bg-uh-charcoal-light p-8 transition-all duration-300 ease-in-out">
          <h2
            className="uppercase tracking-[0.2em] text-uh-silver"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}
          >
            Teams Checked In
          </h2>

          {teamEntries.length === 0 ? (
            <p
              className="text-base text-zinc-500"
              style={{ fontFamily: "var(--font-body)" }}
            >
              No teams yet — be the first to scan and join!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {teamEntries.map(([teamId, team]) => (
                <div
                  key={teamId}
                  className="group rounded-xl border border-uh-silver/20 bg-uh-charcoal p-5 shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-uh-scarlet hover:shadow-[0_0_15px_rgba(200,16,46,0.25)]"
                >
                  <p
                    className="text-lg font-bold text-zinc-50 sm:text-xl"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {team.name}
                  </p>
                  <p
                    className="mt-1 text-xs font-semibold uppercase tracking-widest text-uh-scarlet"
                    style={{ fontFamily: "var(--font-body)" }}
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
   Board Screen
───────────────────────────────────────────── */
interface BoardProps {
  questions: Record<string, Question> | null;
}

function Board({ questions }: BoardProps) {
  const categories = questions
    ? Object.entries(questions).reduce<Record<string, Question[]>>(
        (acc, [, question]) => {
          const bucket = acc[question.category] ?? [];
          bucket.push(question);
          acc[question.category] = bucket;
          return acc;
        },
        {}
      )
    : {};

  const categoryEntries = Object.entries(categories);

  if (categoryEntries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center">
        <p
          className="animate-pulse uppercase leading-none text-uh-scarlet"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 9vw, 7rem)",
            letterSpacing: "0.05em",
          }}
        >
          Game Starting...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col bg-uh-charcoal px-4 py-6 text-zinc-50 sm:px-8">
      {/* UH badge — top-right */}
      <div className="absolute top-5 right-5">
        <UHBadge />
      </div>

      <header className="text-center pb-4">
        <h1
          className="uppercase text-uh-scarlet leading-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 6vw, 5rem)",
            letterSpacing: "0.06em",
          }}
        >
          Trivia Board
        </h1>
        <div className="mx-auto mt-2 h-0.5 w-24 bg-uh-scarlet/50" />
      </header>

      {/*
        ── 2D CSS Grid ──────────────────────────────────────────
        Columns  = one per category (defined via inline style)
        Row 1    = all headers (auto-height, Grid stretches every
                   header cell to the tallest one automatically)
        Rows 2…N = point tiles rendered left-to-right, row-by-row,
                   so every 100 pt tile shares the same grid row,
                   every 200 pt tile shares the next, etc.
        ─────────────────────────────────────────────────────── */}
      {(() => {
        // Pre-sort each category's questions once (display-only sort)
        const sortedCategories = categoryEntries.map(([cat, qs]) => ({
          category: cat,
          questions: [...qs].sort((a, b) => a.points - b.points),
        }));
        const rowCount = Math.max(...sortedCategories.map((c) => c.questions.length), 0);

        return (
          <div
            className="flex-1 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${sortedCategories.length}, minmax(0, 1fr))`,
              alignItems: "stretch",
            }}
          >
            {/* ── Row 0: Category headers ── */}
            {sortedCategories.map(({ category }) => (
              <div
                key={`header-${category}`}
                className="flex items-center justify-center rounded-xl bg-uh-scarlet px-2 py-3 text-center shadow-lg"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(0.85rem, 1.7vw, 1.35rem)",
                  letterSpacing: "0.08em",
                  color: "#f4f4f5",
                  /* No fixed height — Grid row stretches all peers to match the tallest */
                }}
              >
                {category}
              </div>
            ))}

            {/* ── Rows 1…N: Point tiles, rendered row-by-row ── */}
            {Array.from({ length: rowCount }, (_, rowIdx) =>
              sortedCategories.map(({ category, questions }) => {
                const question = questions[rowIdx];
                if (!question) {
                  /* Placeholder keeps the grid cell occupied */
                  return <div key={`empty-${category}-${rowIdx}`} />;
                }
                return (
                  <div
                    key={`${category}-${question.points}`}
                    className={`
                      flex items-center justify-center rounded-xl border transition-all duration-300 ease-in-out
                      ${
                        question.isAnswered
                          ? "border-zinc-800/40 bg-zinc-900/40 opacity-30 cursor-default"
                          : "tile-glow border-uh-scarlet/30 bg-uh-charcoal-light text-uh-silver cursor-pointer hover:scale-105 hover:border-uh-scarlet hover:text-zinc-50 hover:shadow-[0_0_15px_rgba(200,16,46,0.5)]"
                      }
                    `}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.5rem, 3.5vw, 2.8rem)",
                      letterSpacing: "0.04em",
                      padding: "clamp(0.75rem, 2vw, 1.5rem)",
                    }}
                  >
                    {/* Point value always rendered — CSS makes it invisible when answered */}
                    <span className={question.isAnswered ? "invisible" : undefined}>
                      {question.points}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Active Question Screen
───────────────────────────────────────────── */
interface ActiveQuestionProps {
  question: Question;
  revealAnswer: boolean;
  selectedAnswer: string | null;
}

function ActiveQuestion({ question, revealAnswer, selectedAnswer }: ActiveQuestionProps) {
  const options = question.options ?? [];

  return (
    <div className="flex flex-1 flex-col bg-uh-charcoal px-6 py-8 text-zinc-50 sm:px-12">
      {/* Category / points label */}
      <p
        className="text-center uppercase tracking-[0.45em] text-uh-scarlet"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
        }}
      >
        {question.category}&nbsp;·&nbsp;{question.points}&nbsp;pts
      </p>

      {/* Question text */}
      <h1
        className="mx-auto mt-8 max-w-5xl text-center font-bold leading-snug tracking-tight text-zinc-50"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(1.6rem, 4vw, 3.5rem)",
        }}
      >
        {question.questionText}
      </h1>

      {/* Answer options */}
      <div className="mt-10 grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
        {options.map((option) => {
          const isCorrect = option === question.correctAnswer;
          const isSelected = option === selectedAnswer;

          let style =
            "border-uh-silver/25 bg-uh-charcoal-light text-zinc-100 hover:border-uh-silver/60";
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
              className={`flex items-center justify-center rounded-2xl border-2 p-7 text-center transition-all duration-300 ease-in-out ${style}`}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.1rem, 2.5vw, 1.75rem)",
                fontWeight: 700,
              }}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
}
