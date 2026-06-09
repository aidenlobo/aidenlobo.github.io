"use client";

import { QRCodeSVG } from "qrcode.react";
import { useGameState, type Question } from "@/hooks/useGameState";

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

function Welcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center transition-all duration-300 ease-in-out">
      <p className="text-lg font-semibold uppercase tracking-[0.5em] text-uh-silver">
        You&apos;re Invited
      </p>
      <h1 className="mt-6 text-5xl font-black uppercase leading-tight tracking-tight text-zinc-50 sm:text-7xl lg:text-8xl">
        Aiden&apos;s Coog{" "}
        <span className="text-uh-scarlet">Jeopardy</span> Championship
      </h1>
      <div className="mt-8 h-1.5 w-48 bg-uh-scarlet transition-all duration-300 ease-in-out sm:w-64" />
    </div>
  );
}

interface LobbyProps {
  teams: Record<string, { name: string; captain: string }> | null;
}

function Lobby({ teams }: LobbyProps) {
  const teamEntries = teams ? Object.entries(teams) : [];

  return (
    <div className="flex flex-1 flex-col bg-uh-charcoal px-6 py-10 text-zinc-50 sm:px-12">
      <header className="text-center">
        <h1 className="text-5xl font-black uppercase tracking-tight text-uh-scarlet sm:text-7xl">
          Welcome to Aiden&apos;s Graduation
        </h1>
      </header>

      <div className="mt-12 grid flex-1 grid-cols-1 gap-10 lg:grid-cols-2">
        <section className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-uh-silver/30 bg-uh-charcoal-light p-10 text-center transition-all duration-300 ease-in-out">
          <h2 className="text-2xl font-bold uppercase tracking-wide text-uh-silver sm:text-3xl">
            Scan to Join
          </h2>
          <div className="rounded-2xl bg-white p-6">
            <QRCodeSVG value="/join" size={256} />
          </div>
          <p className="max-w-sm text-lg text-zinc-400 sm:text-xl">
            Grab your phone, scan the code above, and register your team to
            get in on the action.
          </p>
        </section>

        <section className="flex flex-col gap-6 rounded-3xl border border-uh-silver/30 bg-uh-charcoal-light p-10 transition-all duration-300 ease-in-out">
          <h2 className="text-2xl font-bold uppercase tracking-wide text-uh-silver sm:text-3xl">
            Teams Checked In
          </h2>

          {teamEntries.length === 0 ? (
            <p className="text-lg text-zinc-500">
              No teams yet — be the first to scan and join!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {teamEntries.map(([teamId, team]) => (
                <div
                  key={teamId}
                  className="rounded-2xl border border-uh-silver/30 bg-uh-charcoal p-6 shadow-lg transition-all duration-300 ease-in-out hover:border-uh-scarlet"
                >
                  <p className="text-xl font-bold text-zinc-50 sm:text-2xl">
                    {team.name}
                  </p>
                  <p className="mt-1 text-sm font-medium uppercase tracking-wide text-uh-scarlet">
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
        <p className="animate-pulse text-6xl font-black uppercase tracking-tight text-uh-scarlet sm:text-8xl">
          Game Starting...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-uh-charcoal px-6 py-10 text-zinc-50 sm:px-12">
      <header className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-tight text-uh-scarlet sm:text-6xl">
          Trivia Board
        </h1>
      </header>

      <div className="mt-10 grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {categoryEntries.map(([category, categoryQuestions]) => (
          <section
            key={category}
            className="flex flex-col gap-3 rounded-3xl border border-uh-silver/30 bg-uh-charcoal-light p-6 transition-all duration-300 ease-in-out"
          >
            <h2 className="rounded-xl border border-uh-silver/40 bg-uh-scarlet py-2 text-center text-lg font-bold uppercase tracking-wide text-uh-silver sm:text-xl">
              {category}
            </h2>
            <div className="flex flex-col gap-3">
              {categoryQuestions
                .sort((a, b) => a.points - b.points)
                .map((question) => (
                  <div
                    key={`${category}-${question.points}`}
                    className={`flex items-center justify-center rounded-2xl border p-6 text-2xl font-black transition-all duration-300 ease-in-out sm:text-3xl ${
                      question.isAnswered
                        ? "border-zinc-800 bg-zinc-800 text-zinc-600"
                        : "border-uh-scarlet/40 bg-uh-charcoal text-uh-scarlet hover:border-uh-scarlet hover:bg-uh-charcoal-light"
                    }`}
                  >
                    {question.points}
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

interface ActiveQuestionProps {
  question: Question;
  revealAnswer: boolean;
  selectedAnswer: string | null;
}

function ActiveQuestion({ question, revealAnswer, selectedAnswer }: ActiveQuestionProps) {
  const options = question.options ?? [];

  return (
    <div className="flex flex-1 flex-col bg-uh-charcoal px-6 py-10 text-zinc-50 sm:px-12">
      <p className="text-center text-lg font-bold uppercase tracking-[0.4em] text-uh-scarlet">
        {question.category} · {question.points} pts
      </p>

      <h1 className="mx-auto mt-8 max-w-5xl text-center text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
        {question.questionText}
      </h1>

      <div className="mt-12 grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
        {options.map((option) => {
          const isCorrect = option === question.correctAnswer;
          const isSelected = option === selectedAnswer;

          let style = "border-uh-silver/30 bg-uh-charcoal-light text-zinc-50";
          if (isSelected) {
            style = isCorrect
              ? "border-emerald-400 bg-emerald-500 text-zinc-950"
              : "border-rose-400 bg-rose-500 text-zinc-950";
          } else if (revealAnswer && isCorrect) {
            style = "border-emerald-400 bg-emerald-500 text-zinc-950";
          }

          return (
            <div
              key={option}
              className={`flex items-center justify-center rounded-3xl border-2 p-8 text-center text-2xl font-bold transition-all duration-300 ease-in-out sm:text-3xl ${style}`}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
}
