"use client";

import { useState } from "react";
import { ref, remove, set, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useGameState, type GameState, type Question } from "@/hooks/useGameState";

const MASTER_KEY = "admin123";

interface SeedQuestion {
  questionText: string;
  correct: string;
  wrong: string[];
}

interface SeedCategory {
  category: string;
  questions: SeedQuestion[];
}

const SEED_CATEGORIES: SeedCategory[] = [
  {
    category: "The Origin Story",
    questions: [
      {
        questionText: "What was the graduate's very first \"crime\" as a toddler?",
        correct: "Escaping the crib repeatedly",
        wrong: [
          "Drawing on the walls with Sharpie",
          "Eating a literal handful of dirt",
          "Hiding the TV remote in the toilet",
        ],
      },
      {
        questionText:
          "Back in elementary school, what was the graduate's absolute favorite, hyper-fixated pastime?",
        correct: "Building massive Lego forts",
        wrong: [
          "Trying to dig a hole to China in the backyard",
          "Staring at the TV playing Minecraft for 8 hours straight",
          "Practicing their future famous autograph",
        ],
      },
      {
        questionText:
          "What was the graduate's driving style like when operating a Power Wheels/tricycle as a kid?",
        correct: "Total vehicular chaos hitting walls, shins, and ankles",
        wrong: [
          "Surprisingly safe and always stayed on the sidewalk",
          "Ghost-riding the whip into the neighbor's bushes",
          "Refused to drive unless someone else pushed them",
        ],
      },
      {
        questionText: "In middle school, what cringey trend did the graduate fully dive into?",
        correct: "Making unreleased gaming videos",
        wrong: [
          "Learning a random instrument for exactly two weeks before quitting",
          "Trying to cut their own bangs in the bathroom mirror",
          "Writing deep, emo poetry in a hidden notebook",
        ],
      },
    ],
  },
  {
    category: "The Athletic \"Career\"",
    questions: [
      {
        questionText:
          "What was the graduate's signature move or most memorable moment on the soccer field?",
        correct: "Faking an injury to get benched and drink juice boxes",
        wrong: [
          "An incredible, un-saveable top-corner goal",
          "Accidentally scoring on their own goalie",
          "Getting a yellow card for arguing with the referee",
        ],
      },
      {
        questionText: "In basketball, what was the graduate statistically most famous for?",
        correct: "Bench-warming with absolute style, hype, and enthusiasm",
        wrong: [
          "Sinking clutch three-pointers at the buzzer",
          "Committing 4 fouls in under two minutes",
          "Spending 90% of the game wiping the bottom of their sneakers",
        ],
      },
      {
        questionText:
          "What was the absolute worst part of the swim team experience for the graduate?",
        correct: "5:00 AM morning practices in freezing water",
        wrong: [
          "The smell of chlorine permanently radiating from their pores",
          "Getting water logged in their ears for three straight months",
          "The pure agony of the 500-yard freestyle",
        ],
      },
      {
        questionText:
          "If the graduate won an award for their sports career, what would the trophy actually say?",
        correct: "\"Most Likely to Turn a Practice Into a Stand-Up Comedy Routine\"",
        wrong: ["\"Future Olympian\"", "\"Never Missed a Single Pass\"", "\"Most Intimidating Game Face\""],
      },
    ],
  },
  {
    category: "High School Survival & Friend Group Drama",
    questions: [
      {
        questionText: "Which high school rule or boundary did the graduate push the absolute most?",
        correct: "Sneaking into first period late with a giant iced coffee",
        wrong: [
          "Testing the absolute limits of the school dress code",
          "Hiding their phone under the desk to text the group chat",
          "\"Borrowing\" a teacher's parking spot",
        ],
      },
      {
        questionText:
          "In the core friend group, what is the graduate's official, undisputed \"assigned role\"?",
        correct: "The Wild Card (unpredictable chaos, up for anything)",
        wrong: [
          "The Group Mom/Dad (keeps everyone alive and on time)",
          "The DJ who absolutely shouldn't be trusted with the aux cord",
          "The Ghost (never checks the group chat, just shows up)",
        ],
      },
      {
        questionText: "What did the graduate spend 90% of their money on during senior year?",
        correct: "Fast food runs at 11:00 PM",
        wrong: [
          "Overpriced online shopping packages they forgot they ordered",
          "Putting $15 of gas in the tank at a time",
          "Subscriptions they keep forgetting to cancel",
        ],
      },
      {
        questionText:
          "What is the quickest way to get the graduate to completely lose their mind or start an argument?",
        correct: "Canceling plans at the very last second when they're already dressed",
        wrong: [
          "Insulting their favorite sports team or musical artist",
          "Telling them they look tired",
          "Forcing them to make a definitive decision on where to eat",
        ],
      },
    ],
  },
  {
    category: "Today's Habits & Future \"Adulting\"",
    questions: [
      {
        questionText:
          "How many alarms does the graduate need to actually wake up for something important today?",
        correct: "Exactly 12 alarms, spaced 3 minutes apart",
        wrong: [
          "Just one (they are a morning person)",
          "Alarms don't work, it requires physical shaking",
          "They rely entirely on their internal clock (and fail)",
        ],
      },
      {
        questionText: "If you get a text from the graduate at 2:45 AM on a weeknight, what are they doing?",
        correct: "Eating shredded cheese straight from the fridge bag",
        wrong: [
          "Writing a 5-page essay due at 8:00 AM",
          "Trapped in a TikTok scrolling vortex they can't escape",
          "Pondering the meaning of life in a random parking lot",
        ],
      },
      {
        questionText: "Which of these basic life skills is the graduate least equipped to handle next year?",
        correct: "Scheduling their own doctor or dentist appointments",
        wrong: [
          "Cooking anything that doesn't involve a microwave",
          "Doing a load of laundry without shrinking everything they own",
          "Budgeting money for things that aren't iced coffee",
        ],
      },
      {
        questionText: "How long into their next chapter will it take for them to call home crying?",
        correct: "Day 2, because they deeply miss the family dog",
        wrong: [
          "Week 3, because they failed a minor syllabus quiz",
          "Month 2, because they completely ran out of money",
          "Never, they are going to thrive on pure chaos.",
        ],
      },
    ],
  },
];

function buildSeedQuestions(): Record<string, Question> {
  const payload: Record<string, Question> = {};

  SEED_CATEGORIES.forEach((seedCategory, categoryIndex) => {
    seedCategory.questions.forEach((seedQuestion, questionIndex) => {
      const id = `q_${categoryIndex + 1}_${questionIndex + 1}`;
      payload[id] = {
        category: seedCategory.category,
        points: (questionIndex + 1) * 100,
        type: "kahoot",
        questionText: seedQuestion.questionText,
        answerText: seedQuestion.correct,
        isAnswered: false,
        options: [seedQuestion.correct, ...seedQuestion.wrong],
        correctAnswer: seedQuestion.correct,
      };
    });
  });

  return payload;
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { gameState, teams, questions } = useGameState();

  const handlePasscodeSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passcode === MASTER_KEY) {
      setAuthenticated(true);
      setError(null);
    } else {
      setError("Incorrect passcode.");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6">
        <form
          onSubmit={handlePasscodeSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"
        >
          <h1 className="text-center text-2xl font-bold text-zinc-50">
            Admin Access
          </h1>
          <label
            htmlFor="passcode"
            className="text-sm font-semibold text-zinc-400"
          >
            Enter master key
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-zinc-50 outline-none focus:border-amber-400"
          />
          {error && (
            <p className="text-sm font-medium text-red-400">{error}</p>
          )}
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-5 py-3 text-base font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const status = gameState?.status ?? "lobby";
  const currentQuestionId = gameState?.currentQuestionId ?? null;
  const teamEntries = teams ? Object.entries(teams) : [];
  const questionEntries = questions ? Object.entries(questions) : [];

  const setGameStatus = (nextStatus: GameState["status"]) => {
    void update(ref(database, "gameState"), { status: nextStatus });
  };

  const selectQuestion = (questionId: string) => {
    void update(ref(database, "gameState"), {
      currentQuestionId: questionId,
      selectedAnswer: null,
      revealAnswer: false,
    });
  };

  const selectAnswer = (option: string) => {
    void update(ref(database, "gameState"), { selectedAnswer: option });
  };

  const revealCorrectAnswer = () => {
    void update(ref(database, "gameState"), { revealAnswer: true });
  };

  const backToBoard = () => {
    if (currentQuestionId) {
      void update(ref(database, `questions/${currentQuestionId}`), {
        isAnswered: true,
      });
    }
    void update(ref(database, "gameState"), {
      currentQuestionId: null,
      selectedAnswer: null,
      revealAnswer: false,
    });
  };

  const resetGameBoard = () => {
    if (
      !window.confirm(
        "This will mark every question as unanswered and clear the active question. Continue?"
      )
    ) {
      return;
    }

    if (questions) {
      Object.keys(questions).forEach((questionId) => {
        void update(ref(database, `questions/${questionId}`), {
          isAnswered: false,
        });
      });
    }

    void update(ref(database, "gameState"), {
      currentQuestionId: null,
      selectedAnswer: null,
      revealAnswer: false,
    });
  };

  const adjustScore = (teamId: string, currentScore: number, delta: number) => {
    void update(ref(database, `teams/${teamId}`), {
      score: currentScore + delta,
    });
  };

  const removeTeam = (teamId: string) => {
    void remove(ref(database, `teams/${teamId}`));
  };

  const seedDatabase = () => {
    if (
      !window.confirm(
        "This will overwrite the entire questions node with the 16 seed questions. Continue?"
      )
    ) {
      return;
    }
    void set(ref(database, "questions"), buildSeedQuestions());
  };

  return (
    <div className="flex flex-1 flex-col gap-10 bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-8">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-amber-400 sm:text-4xl">
          Control Panel
        </h1>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-300">
          Game Control
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Current status:{" "}
          <span className="font-semibold text-amber-400">{status}</span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setGameStatus("welcome")}
            disabled={status === "welcome"}
            className="rounded-xl bg-zinc-800 px-5 py-4 text-base font-bold uppercase tracking-wide text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-amber-400 disabled:text-zinc-950"
          >
            1. Show Welcome Screen
          </button>
          <button
            type="button"
            onClick={() => setGameStatus("lobby")}
            disabled={status === "lobby"}
            className="rounded-xl bg-zinc-800 px-5 py-4 text-base font-bold uppercase tracking-wide text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-amber-400 disabled:text-zinc-950"
          >
            2. Open Lobby
          </button>
          <button
            type="button"
            onClick={() => setGameStatus("board")}
            disabled={status === "board"}
            className="rounded-xl bg-zinc-800 px-5 py-4 text-base font-bold uppercase tracking-wide text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-amber-400 disabled:text-zinc-950"
          >
            3. Show Board
          </button>
        </div>

        <button
          type="button"
          onClick={resetGameBoard}
          className="mt-4 w-full rounded-xl border-2 border-rose-400 bg-rose-500/10 px-5 py-4 text-base font-black uppercase tracking-wide text-rose-300 transition-colors hover:bg-rose-500/20"
        >
          Reset Game Board
        </button>
      </section>

      {status === "board" && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-300">
            {currentQuestionId ? "Active Question Controls" : "Question Selection"}
          </h2>

          {currentQuestionId ? (
            (() => {
              const activeQuestion = questions?.[currentQuestionId] ?? null;
              const options = activeQuestion?.options ?? [];
              const selectedAnswer = gameState?.selectedAnswer ?? null;

              return (
                <div className="mt-4 flex flex-col gap-4">
                  <p className="text-sm text-zinc-400">
                    Now showing:{" "}
                    <span className="font-semibold text-amber-400">
                      {activeQuestion?.questionText ?? currentQuestionId}
                    </span>
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectAnswer(option)}
                        className={`rounded-xl border-2 p-4 text-left text-base font-semibold transition-colors ${
                          option === selectedAnswer
                            ? "border-amber-400 bg-amber-400/10 text-amber-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={revealCorrectAnswer}
                      className="rounded-2xl bg-emerald-500 px-6 py-8 text-xl font-black uppercase tracking-wide text-zinc-950 transition-colors hover:bg-emerald-400"
                    >
                      Reveal Correct Answer
                    </button>
                    <button
                      type="button"
                      onClick={backToBoard}
                      className="rounded-2xl bg-amber-400 px-6 py-8 text-xl font-black uppercase tracking-wide text-zinc-950 transition-colors hover:bg-amber-300"
                    >
                      Back to Board
                    </button>
                  </div>
                </div>
              );
            })()
          ) : questionEntries.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No questions loaded yet — seed the database below.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {questionEntries.map(([questionId, question]) => (
                <button
                  key={questionId}
                  type="button"
                  onClick={() => selectQuestion(questionId)}
                  disabled={question.isAnswered}
                  className="flex flex-col items-start gap-1 rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-left transition-colors hover:border-amber-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:opacity-50"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {question.category}
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {question.points} pts
                  </span>
                  <span className="text-sm text-zinc-300 line-clamp-2">
                    {question.questionText}
                  </span>
                  {question.isAnswered && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Answered
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-300">
          Team Management
        </h2>

        {teamEntries.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No teams checked in yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {teamEntries.map(([teamId, team]) => (
              <div
                key={teamId}
                className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xl font-bold text-zinc-50">{team.name}</p>
                  <p className="text-sm font-medium text-zinc-400">
                    Score:{" "}
                    <span className="font-bold text-amber-400">
                      {team.score}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => adjustScore(teamId, team.score, 100)}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScore(teamId, team.score, -100)}
                    className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-rose-400"
                  >
                    -100
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTeam(teamId)}
                    className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-bold text-zinc-300 transition-colors hover:border-rose-400 hover:text-rose-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border-2 border-dashed border-rose-400 bg-rose-950/30 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-rose-300">
          Danger Zone — Temporary Setup Tool
        </h2>
        <p className="mt-2 text-sm text-rose-200/80">
          Overwrites the entire <code>questions</code> node with the 16 seed
          trivia questions. Remove this button once seeding is complete.
        </p>
        <button
          type="button"
          onClick={seedDatabase}
          className="mt-4 w-full rounded-xl bg-rose-500 px-5 py-4 text-base font-bold uppercase tracking-wide text-zinc-950 transition-colors hover:bg-rose-400 sm:w-auto"
        >
          Seed Database
        </button>
      </section>
    </div>
  );
}