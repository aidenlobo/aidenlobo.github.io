"use client";

import { useEffect, useState } from "react";
import { ref, remove, set, update } from "firebase/database";
import { database } from "@/lib/firebase";
import {
  useGameState,
  type GameState,
  type Question,
  type SpotifyState,
} from "@/hooks/useGameState";
import {
  playGameTrack,
  pauseGameTrack,
  resumeGameTrack,
} from "@/app/actions/spotifyActions";

const MASTER_KEY = "admin123";

/* ─────────────────────────────────────────────
   Track resolution helper

   Reads the music fields off a question, preferring the schema's
   `spotifyUri` / `startTime` / `stopTime` (seconds) but falling back
   to the legacy `spotifyTrackUri` / `playbackStartTimeMs` so older
   seed data still works.
───────────────────────────────────────────── */
interface ResolvedTrack {
  uri: string;
  startTime: number; // seconds
  stopTime: number | null; // seconds
}

function resolveTrack(question: Question | null | undefined): ResolvedTrack | null {
  if (!question) return null;
  const uri = question.spotifyUri ?? question.spotifyTrackUri;
  if (!uri) return null;

  const startTime =
    question.startTime ??
    (question.playbackStartTimeMs !== undefined
      ? question.playbackStartTimeMs / 1000
      : 0);
  const stopTime = question.stopTime ?? null;

  return { uri, startTime, stopTime };
}

/* ─────────────────────────────────────────────
   Final database seed — Phase 4

   This is the complete question set for tonight's game: five
   100/200/300/400 categories plus the Final Jeopardy clue. Seeding
   overwrites the entire `questions` node with exactly this data.
───────────────────────────────────────────── */
const SEED_QUESTIONS: Record<string, Question> = {
  q_1_100: {
    category: "The Origin Story",
    points: 100,
    type: "multiple_choice",
    questionText: "What swim team was I a part of?",
    answerText: "New Territory Tarpons",
    options: [
      "New Territory Tarpons",
      "First Colony Gators",
      "Sweetwater Surfers",
      "Sugar Creek Sharks",
    ],
    isAnswered: false,
  },
  q_1_200: {
    category: "The Origin Story",
    points: 200,
    type: "true_false",
    questionText:
      "True or False: Aiden treats this house like a hotel and has officially logged more hours out of the house with his friends than he has with his own family.",
    answerText: "True",
    options: ["True", "False"],
    isAnswered: false,
  },
  q_1_300: {
    category: "The Origin Story",
    points: 300,
    type: "fill_blank",
    questionText:
      "When Aiden was 7, he was absolutely convinced that he was going to be a [BLANK] when he grew up.",
    answerText: "paleontologist",
    isAnswered: false,
  },
  q_1_400: {
    category: "The Origin Story",
    points: 400,
    type: "multiple_choice",
    questionText: "When did I get my first hangover?",
    answerText: "Prom weekend in Galveston",
    options: [
      "Prom weekend in Galveston",
      "Homecoming (Hoco) weekend",
      "friends' 18th birthday trip to Austin",
      "friends' afterparty for graduation parties",
    ],
    isAnswered: false,
  },
  q_2_100: {
    category: "Musical Memories",
    points: 100,
    type: "audio_lyric",
    spotifyUri: "spotify:track:7oOOI85fVQvVnK5ynNMdW7",
    startTime: 0,
    stopTime: 5,
    questionText: "Guess the Song & Artist!",
    answerText: "Rock with You by Michael Jackson",
    isAnswered: false,
  },
  q_2_200: {
    category: "Musical Memories",
    points: 200,
    type: "audio_lyric",
    spotifyUri: "spotify:track:3U5JVgI2x4rDyHGObzJfNf",
    startTime: 165,
    stopTime: 186,
    questionText: "Finish the lyric: Feel the rain on your skin...",
    answerText: "...No one else can feel it for you.",
    isAnswered: false,
  },
  q_2_300: {
    category: "Musical Memories",
    points: 300,
    type: "multiple_choice",
    questionText:
      "Which of these iconic Maroon 5 anthems actually made it onto his most-played list?",
    answerText: "This Love",
    options: ["This Love", "She Will Be Loved", "Sugar", "Payphone"],
    isAnswered: false,
  },
  q_2_400: {
    category: "Musical Memories",
    points: 400,
    type: "multiple_choice",
    questionText:
      "The year Aiden was born (2008), the Grammy Awards were completely dominated by one iconic artist who took home Record of the Year, Song of the Year, and Best New Artist. Who was it?",
    answerText: "Amy Winehouse",
    options: ["Amy Winehouse", "Taylor Swift", "Beyoncé", "Rihanna"],
    isAnswered: false,
  },
  q_3_100: {
    category: "Family Feud Frenzy",
    points: 100,
    type: "family_feud",
    questionText:
      "When Aiden says 'I am almost done' with a game, what does he actually mean?",
    topAnswers: [
      "I just started a new match.",
      "Give me 45 more minutes.",
      "I cannot pause an online game.",
      "Bring my food to my room.",
    ],
    isAnswered: false,
  },
  q_3_200: {
    category: "Family Feud Frenzy",
    points: 200,
    type: "family_feud",
    questionText: "Name the top 4 things you will always find in Aiden's fridge or pantry.",
    topAnswers: ["Protein Powder", "Orange Chicken", "Cocoa Krispies", "Milk"],
    isAnswered: false,
  },
  q_3_300: {
    category: "Family Feud Frenzy",
    points: 300,
    type: "family_feud",
    questionText:
      "If Aiden was given $1,000 to spend today, what are the top 3 things he would buy?",
    topAnswers: ["Legos", "Technology/Video Games", "Clothes/Shoes"],
    isAnswered: false,
  },
  q_3_400: {
    category: "Family Feud Frenzy",
    points: 400,
    type: "family_feud",
    questionText:
      "Name the top 4 excuses Aiden uses when he’s trying to get out of doing chores or going somewhere.",
    topAnswers: [
      "Make Ethan do it.",
      "I’m going out with friends",
      "I'm about to go to the gym",
      "Let me finish this game first",
    ],
    isAnswered: false,
  },
  q_4_100: {
    category: "Coog Life & Adulting",
    points: 100,
    type: "multiple_choice",
    questionText: "What was Aiden’s go-to late-night food spot?",
    answerText: "Whataburger",
    options: ["Whataburger", "Canes", "McDonald's", "Taco Bell"],
    isAnswered: false,
  },
  q_4_200: {
    category: "Coog Life & Adulting",
    points: 200,
    type: "fill_blank",
    questionText: "Aiden’s biggest fear about entering the real world is [BLANK].",
    answerText: "Spending his own money",
    isAnswered: false,
  },
  q_4_300: {
    category: "Coog Life & Adulting",
    points: 300,
    type: "multiple_choice",
    questionText: "What is the exact title of the degree Aiden is graduating with?",
    answerText: "Business MIS",
    options: ["Business MIS", "Business Finance", "Psychology BS", "Supply Chain Management"],
    isAnswered: false,
  },
  q_4_400: {
    category: "Coog Life & Adulting",
    points: 400,
    type: "multiple_choice",
    questionText:
      "Aiden was born in May 2008. Assuming he doesn't figure out a master career plan before then, in what exact year will he legally get kicked off of Rohan and Debbie's health insurance?",
    answerText: "2034",
    options: ["2034", "2031", "2032", "2033"],
    isAnswered: false,
  },
  q_5_100: {
    category: "The Wildcard Round",
    points: 100,
    type: "multiple_choice",
    questionText:
      "Aiden has big plans for the future, but what does he say is his absolute biggest long-term career goal?",
    answerText: "I'm still figuring out the exact path",
    options: [
      "I'm still figuring out the exact path",
      "Surviving my 20s without completely going broke.",
      "Becoming a professional Gym-Bro so I never have to commute.",
      "Marrying rich",
    ],
    isAnswered: false,
  },
  q_5_200: {
    category: "The Wildcard Round",
    points: 200,
    type: "true_false",
    questionText:
      "True or False: Aiden was born in May 2008 and graduated in June 2026. This means he has lived his entire life never knowing a world without the iPhone.",
    answerText: "True",
    options: ["True", "False"],
    isAnswered: false,
  },
  q_5_300: {
    category: "The Wildcard Round",
    points: 300,
    type: "family_feud",
    questionText:
      "Name the top 4 household skills Aiden needs to learn immediately before moving out on his own.",
    topAnswers: [
      "Doing his own laundry.",
      "Cooking a meal that does not require a microwave.",
      "Waking up to his very first alarm.",
      "Budgeting",
    ],
    isAnswered: false,
  },
  q_5_400: {
    category: "The Wildcard Round",
    points: 400,
    type: "multiple_choice",
    questionText:
      "Fast forward a few years. Aiden just deposited his very first massive, real-world adult paycheck. What is the absolute first unnecessarily expensive thing he is buying?",
    answerText: "Full Apple Ecosystem",
    options: [
      "Full Apple Ecosystem",
      "A massive, top-tier gaming monitor.",
      "A pair of overpriced, limited-edition sneakers.",
      "A ridiculous car modification.",
    ],
    isAnswered: false,
  },
  final_jeopardy: {
    category: "Final Jeopardy",
    points: 0,
    type: "final_jeopardy",
    questionText:
      "Aiden and Ethan are highly competitive. But according to Aiden, what is the one specific event where he can confidently absolutely destroy Ethan?",
    answerText: "Video Games",
    options: ["Video Games", "Being Mom's favorite", "Eating", "Comedy"],
    isAnswered: false,
  },
};

const SEED_QUESTION_COUNT = Object.keys(SEED_QUESTIONS).length;

/* ─────────────────────────────────────────────
   Shared tiny components
───────────────────────────────────────────── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-[0.2em] text-uh-silver"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
    </h2>
  );
}

/** Standard matte-black control button */
function ControlBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wide
        transition-all duration-300 ease-in-out
        ${
          active
            ? "border-uh-silver bg-uh-silver text-zinc-900 cursor-default"
            : disabled
            ? "cursor-not-allowed border-uh-scarlet bg-uh-scarlet text-zinc-50 opacity-80"
            : "border-uh-silver/30 bg-uh-charcoal text-zinc-200 hover:border-uh-scarlet hover:bg-uh-charcoal-light"
        }
      `}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Admin Page
───────────────────────────────────────────── */
export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spotifyWarning, setSpotifyWarning] = useState(false);
  /** Per-team draft values for the exact-score override inputs. */
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  /**
   * Per-team draft values for the editable name/roster inputs. Keyed by
   * teamId; absent until the host first edits a field, at which point the
   * draft seeds from the live values. `members` is a single comma-separated
   * string for easy editing, split back into an array on Save.
   */
  const [teamInfoDrafts, setTeamInfoDrafts] = useState<
    Record<string, { name: string; captain: string; members: string }>
  >({});

  const { gameState, teams, questions } = useGameState();
  const spotifyState = gameState?.spotifyState ?? null;

  /* ── "Finish the Lyric" auto-stop ──
     Whenever playback is active and the question defines a stopTime,
     schedule a pause for the moment the snippet window elapses.
     `updatedAt` anchors when playback (re)started from `startTime`,
     so the remaining time survives re-renders and client reloads. */
  useEffect(() => {
    if (!spotifyState?.isPlaying || spotifyState.stopTime === null) return;

    const durationMs = (spotifyState.stopTime - spotifyState.startTime) * 1000;
    if (durationMs <= 0) return;

    const elapsedMs = Date.now() - spotifyState.updatedAt;
    const remainingMs = durationMs - elapsedMs;

    const stop = () => {
      void update(ref(database, "gameState/spotifyState"), { isPlaying: false });
      void pauseGameTrack();
    };

    if (remainingMs <= 0) {
      stop();
      return;
    }

    const timer = setTimeout(stop, remainingMs);
    return () => clearTimeout(timer);
  }, [
    spotifyState?.isPlaying,
    spotifyState?.startTime,
    spotifyState?.stopTime,
    spotifyState?.updatedAt,
  ]);

  const handlePasscodeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passcode === MASTER_KEY) {
      setAuthenticated(true);
      setError(null);
    } else {
      setError("Incorrect passcode.");
    }
  };

  /* ── Passcode Gate ── */
  if (!authenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6">
        <form
          onSubmit={handlePasscodeSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-uh-silver/25 bg-uh-charcoal-light p-8 shadow-xl transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/uh-logo.jpg"
              alt="University of Houston"
              className="h-11 w-11 shrink-0 rounded-md object-cover shadow-md"
            />
            <h1
              className="text-2xl font-bold text-zinc-50"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Admin <span className="text-uh-scarlet">Access</span>
            </h1>
          </div>

          <label
            htmlFor="passcode"
            className="text-xs font-semibold uppercase tracking-widest text-uh-silver"
          >
            Master Key
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="input-underline"
            placeholder="Enter passcode..."
          />
          {error && (
            <p className="text-xs font-medium text-red-400">{error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-uh-scarlet px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-50 transition-all duration-300 hover:bg-uh-scarlet-dark active:scale-95"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  /* ── Authenticated state setup ── */
  const status = gameState?.status ?? "lobby";
  const currentQuestionId = gameState?.currentQuestionId ?? null;
  const activeQuestion = currentQuestionId ? questions?.[currentQuestionId] ?? null : null;
  const activePoints = activeQuestion?.points ?? 0;
  const activeCorrectAnswer = activeQuestion?.correctAnswer ?? activeQuestion?.answerText;
  const activeTrack = resolveTrack(activeQuestion);
  const isPlaying = spotifyState?.isPlaying ?? false;
  const answersLocked = gameState?.answersLocked ?? false;
  const teamEntries = teams ? Object.entries(teams) : [];

  /* ── Board-matching question layout ──
     Groups questions into the same category columns / point-ordered
     rows as the TV board (see Board() in app/page.tsx), so the admin's
     selection grid lines up spatially with what's on screen and the
     chance of a misclick is minimized. Final Jeopardy is pulled out
     into its own section, exactly as the board excludes it from the grid. */
  const boardCategoryOrder: string[] = [];
  const boardGrouped: Record<string, [string, Question][]> = {};
  let finalJeopardyEntry: [string, Question] | null = null;

  if (questions) {
    for (const [questionId, question] of Object.entries(questions)) {
      if (question.type === "final_jeopardy" || question.category === "Final Jeopardy") {
        finalJeopardyEntry = [questionId, question];
        continue;
      }
      if (!boardGrouped[question.category]) {
        boardGrouped[question.category] = [];
        boardCategoryOrder.push(question.category);
      }
      boardGrouped[question.category].push([questionId, question]);
    }
  }

  const boardCategories = boardCategoryOrder.map((category) => ({
    category,
    questions: [...boardGrouped[category]].sort((a, b) => a[1].points - b[1].points),
  }));
  const maxBoardRows =
    boardCategories.length > 0
      ? Math.max(...boardCategories.map((c) => c.questions.length))
      : 0;
  const totalQuestionCount = questions ? Object.keys(questions).length : 0;

  /**
   * Switch the TV's top-level view. Always clears the active question
   * (currentQuestionId + its selection/reveal state) so the board never
   * gets stuck showing a stale question after the host navigates away.
   */
  const setGameStatus = (nextStatus: GameState["status"]) => {
    void update(ref(database, "gameState"), {
      status: nextStatus,
      currentQuestionId: null,
      selectedAnswer: null,
      revealAnswer: false,
    });
  };

  /* ── Spotify transport ── all commands mirror into gameState.spotifyState ── */
  const writeSpotifyState = (partial: Partial<SpotifyState>) => {
    void update(ref(database, "gameState/spotifyState"), partial);
  };

  /** (Re)start a track from its startTime — used by select, "Play" (fresh), and "Restart". */
  const startPlayback = (track: ResolvedTrack) => {
    setSpotifyWarning(false);
    writeSpotifyState({
      isPlaying: true,
      trackUri: track.uri,
      startTime: track.startTime,
      stopTime: track.stopTime,
      updatedAt: Date.now(),
    });
    void playGameTrack(track.uri, track.startTime * 1000).then((result) => {
      if (!result.ok && result.reason === "no_device") {
        setSpotifyWarning(true);
        writeSpotifyState({ isPlaying: false });
      } else if (result.ok) {
        setSpotifyWarning(false);
      }
    });
  };

  const handlePlay = () => {
    if (!activeTrack) return;
    // If this track is already loaded, resume in place; otherwise start fresh.
    if (spotifyState?.trackUri === activeTrack.uri && !isPlaying) {
      writeSpotifyState({ isPlaying: true, updatedAt: Date.now() });
      void resumeGameTrack().then((result) => {
        if (!result.ok && result.reason === "no_device") setSpotifyWarning(true);
      });
    } else {
      startPlayback(activeTrack);
    }
  };

  const handlePause = () => {
    writeSpotifyState({ isPlaying: false });
    void pauseGameTrack();
  };

  const handleRestart = () => {
    if (!activeTrack) return;
    startPlayback(activeTrack);
  };

  /**
   * "Finish the Lyric" reveal: jump to the clue's stopTime and play the rest
   * of the song from there, indefinitely. By writing `stopTime: null` the
   * shared auto-stop effect is disabled, so playback continues until the host
   * presses Pause or navigates away (which clears playback).
   */
  const handlePlayAnswer = () => {
    if (!activeTrack || activeTrack.stopTime === null) return;
    const answerStart = activeTrack.stopTime;
    setSpotifyWarning(false);
    writeSpotifyState({
      isPlaying: true,
      trackUri: activeTrack.uri,
      startTime: answerStart,
      stopTime: null,
      updatedAt: Date.now(),
    });
    void playGameTrack(activeTrack.uri, answerStart * 1000).then((result) => {
      if (!result.ok && result.reason === "no_device") {
        setSpotifyWarning(true);
        writeSpotifyState({ isPlaying: false });
      } else if (result.ok) {
        setSpotifyWarning(false);
      }
    });
  };

  const retryPlayback = () => {
    if (!activeTrack) return;
    startPlayback(activeTrack);
  };

  const selectQuestion = (questionId: string) => {
    void update(ref(database, "gameState"), {
      currentQuestionId: questionId,
      selectedAnswer: null,
      revealAnswer: false,
    });
    setSpotifyWarning(false);

    const question = questions?.[questionId];
    const track = resolveTrack(question);
    if (question?.isMusicRound && track) {
      startPlayback(track);
    } else {
      // Non-music question: ensure any prior playback is cleared.
      writeSpotifyState({ isPlaying: false, trackUri: null, stopTime: null });
    }
  };

  const selectAnswer = (option: string) => {
    void update(ref(database, "gameState"), { selectedAnswer: option });
    handlePause();
  };

  const revealCorrectAnswer = () => {
    void update(ref(database, "gameState"), { revealAnswer: true });
    handlePause();
  };

  /**
   * Family Feud: toggle the reveal state of a single answer on the active
   * question, persisting the full index-aligned `revealedAnswers` array to
   * Firebase so the TV board can unveil answers one at a time.
   */
  const toggleRevealedAnswer = (index: number) => {
    if (!currentQuestionId || !activeQuestion?.topAnswers) return;
    const current =
      activeQuestion.revealedAnswers ??
      activeQuestion.topAnswers.map(() => false);
    // Clone and normalize to the answer count, then flip the target index.
    const next = activeQuestion.topAnswers.map((_, i) => current[i] ?? false);
    next[index] = !next[index];
    void update(ref(database, `questions/${currentQuestionId}`), {
      revealedAnswers: next,
    });
  };

  /**
   * Kick off the on-screen 15-second countdown by stamping the moment it
   * should hit zero into gameState.timerEndsAt.
   */
  const startTimer = () => {
    void update(ref(database, "gameState"), { timerEndsAt: Date.now() + 15000 });
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
    setSpotifyWarning(false);
    handlePause();
  };

  /**
   * Reset / Undo the active question: return it to the board as UNANSWERED
   * (the opposite of "Back to Board", which marks it done).
   */
  const undoQuestion = () => {
    if (currentQuestionId) {
      void update(ref(database, `questions/${currentQuestionId}`), {
        isAnswered: false,
      });
    }
    void update(ref(database, "gameState"), {
      currentQuestionId: null,
      selectedAnswer: null,
      revealAnswer: false,
    });
    setSpotifyWarning(false);
    handlePause();
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
    handlePause();
  };

  const adjustScore = (teamId: string, currentScore: number, delta: number) => {
    void update(ref(database, `teams/${teamId}`), {
      score: currentScore + delta,
    });
  };

  /**
   * Clear a team's score draft so the input reverts to displaying the live
   * score (no write to Firebase). Shared by the blank-input and successful-
   * commit paths.
   */
  const clearScoreDraft = (teamId: string) => {
    setScoreDrafts((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
  };

  /**
   * Set a team's score to an exact custom value typed by the host.
   * If the input is blank, simply revert to displaying the current score —
   * never write an empty value or NaN to Firebase. Non-numeric drafts are
   * ignored. On a successful commit, clears the draft so the input falls
   * back to the live score.
   */
  const setExactScore = (teamId: string) => {
    const raw = scoreDrafts[teamId];
    // Blank input: revert to the live score, write nothing.
    if (raw === undefined || raw.trim() === "") {
      clearScoreDraft(teamId);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    void update(ref(database, `teams/${teamId}`), { score: parsed });
    clearScoreDraft(teamId);
  };

  const removeTeam = (teamId: string) => {
    void remove(ref(database, `teams/${teamId}`));
  };

  /** Seed (if needed) and update a single field of a team's editable-info draft. */
  const updateTeamInfoDraft = (
    teamId: string,
    field: "name" | "captain" | "members",
    value: string
  ) => {
    setTeamInfoDrafts((prev) => {
      const existing = prev[teamId] ?? {
        name: teams?.[teamId]?.name ?? "",
        captain: teams?.[teamId]?.captain ?? "",
        members: (teams?.[teamId]?.members ?? []).join(", "),
      };
      return { ...prev, [teamId]: { ...existing, [field]: value } };
    });
  };

  /**
   * Commit a team's edited name / captain / roster to Firebase. The members
   * string is split on commas, trimmed, and emptied entries dropped. Clears
   * the draft on success so the inputs fall back to the live values.
   */
  const saveTeamInfo = (teamId: string) => {
    const draft = teamInfoDrafts[teamId];
    if (!draft) return;
    const name = draft.name.trim();
    const captain = draft.captain.trim();
    const members = draft.members
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    // Don't write an empty team name — keep the existing one instead.
    if (name === "") return;
    void update(ref(database, `teams/${teamId}`), { name, captain, members });
    setTeamInfoDrafts((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
  };

  const seedDatabase = () => {
    if (
      !window.confirm(
        `This will overwrite the entire questions node with the final ${SEED_QUESTION_COUNT}-question set (including Final Jeopardy). Continue?`
      )
    ) {
      return;
    }
    void set(ref(database, "questions"), SEED_QUESTIONS);
  };

  /* ── Final Jeopardy transitions ── */
  const startFinalWager = () => {
    void update(ref(database, "gameState"), {
      status: "final_wager",
      currentQuestionId: null,
      selectedAnswer: null,
      revealAnswer: false,
      answersLocked: false,
    });
    handlePause();
  };

  const startFinalAnswer = () => {
    void update(ref(database, "gameState"), {
      status: "final_answer",
      answersLocked: false,
    });
  };

  const toggleAnswersLock = () => {
    void update(ref(database, "gameState"), { answersLocked: !answersLocked });
  };

  const startFinalScoring = () => {
    void update(ref(database, "gameState"), { status: "final_scoring" });
  };

  const showPodium = () => {
    void update(ref(database, "gameState"), { status: "podium" });
  };

  /**
   * Manually confirm a team's Final Jeopardy result. Avoids risky
   * auto-grading by string match — the Admin reads the answer aloud
   * and decides correct/incorrect.
   */
  const gradeFinalJeopardy = (
    teamId: string,
    currentScore: number,
    wager: number,
    correct: boolean
  ) => {
    void update(ref(database, `teams/${teamId}`), {
      finalCalculatedScore: correct ? currentScore + wager : currentScore - wager,
    });
  };

  /**
   * Undo a Final Jeopardy grade: remove the team's finalCalculatedScore
   * field entirely, returning them to an ungraded state.
   */
  const undoFinalScore = (teamId: string) => {
    void remove(ref(database, `teams/${teamId}/finalCalculatedScore`));
  };

  /** Shared styling for the four Final Jeopardy phase-transition buttons. */
  const finalPhaseBtnClass = (isActive: boolean) =>
    `rounded-lg border-2 px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-all duration-300 active:scale-[0.98] ${
      isActive
        ? "cursor-default border-amber-400 bg-amber-400 text-zinc-950"
        : "border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-zinc-950"
    }`;

  /* ── Main admin UI ── */
  return (
    <div
      className="flex flex-1 flex-col gap-3 bg-uh-charcoal px-4 py-3 text-zinc-50 sm:px-6"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/uh-logo.jpg"
            alt="University of Houston"
            className="h-11 w-11 shrink-0 rounded-md object-cover shadow-md"
          />
          <h1
            className="text-xl font-black uppercase tracking-tight text-uh-scarlet sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Control Panel
          </h1>
        </div>
        <span className="rounded-full border border-uh-silver/20 bg-uh-charcoal-light px-3 py-1 text-xs font-semibold uppercase tracking-widest text-uh-silver">
          Status: <span className="text-uh-scarlet">{status}</span>
        </span>
      </header>

      {/* ── Game Control ── */}
      <section className="rounded-xl border border-uh-silver/20 bg-uh-charcoal-light p-4 transition-all duration-300">
        <SectionHeading>Game Control</SectionHeading>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <ControlBtn
            onClick={() => setGameStatus("welcome")}
            disabled={status === "welcome"}
            active={status === "welcome"}
          >
            1. Welcome
          </ControlBtn>
          <ControlBtn
            onClick={() => setGameStatus("lobby")}
            disabled={status === "lobby"}
            active={status === "lobby"}
          >
            2. Lobby
          </ControlBtn>
          <ControlBtn
            onClick={() => setGameStatus("board")}
            disabled={status === "board"}
            active={status === "board"}
          >
            3. Board
          </ControlBtn>
        </div>

        <button
          type="button"
          onClick={startTimer}
          className="mt-2.5 w-full rounded-lg border-2 border-amber-400 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-300 transition-all duration-300 hover:bg-amber-400 hover:text-zinc-950 active:scale-[0.98]"
        >
          Start 15s Timer
        </button>

        <button
          type="button"
          onClick={resetGameBoard}
          className="mt-2.5 w-full rounded-lg border-2 border-rose-500 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-rose-300 transition-all duration-300 hover:bg-rose-500 hover:text-zinc-50 active:scale-[0.98]"
        >
          Reset Entire Game Board
        </button>
      </section>

      {/* ── Question Section (Board mode) ── */}
      {status === "board" && (
        <section className="rounded-xl border border-uh-silver/20 bg-uh-charcoal-light p-4 transition-all duration-300">
          <SectionHeading>
            {currentQuestionId ? "Active Question Controls" : "Question Selection"}
          </SectionHeading>

          {currentQuestionId ? (
            (() => {
              const options = activeQuestion?.options ?? [];
              const selectedAnswer = gameState?.selectedAnswer ?? null;

              return (
                <div className="mt-3 flex flex-col gap-3">
                  {spotifyWarning && (
                    <div className="flex flex-col gap-2 rounded-lg border border-uh-scarlet bg-uh-scarlet/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold text-uh-silver">
                        No active Spotify device. Play a track on your host device, then retry.
                      </p>
                      <button
                        type="button"
                        onClick={retryPlayback}
                        className="shrink-0 rounded-md border border-uh-scarlet px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-uh-scarlet transition-all duration-300 hover:bg-uh-scarlet hover:text-zinc-50"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-zinc-400">
                    Now showing:{" "}
                    <span className="font-semibold text-uh-scarlet">
                      {activeQuestion?.questionText ?? currentQuestionId}
                    </span>
                  </p>

                  {/* ── Spotify manual transport ── only for music questions ── */}
                  {activeTrack && (
                    <div className="rounded-lg border border-uh-silver/20 bg-uh-charcoal p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-uh-silver">
                          Music Transport
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${
                            isPlaying
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-uh-silver/15 text-uh-silver"
                          }`}
                        >
                          {isPlaying ? "Playing" : "Paused"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={handlePlay}
                          disabled={isPlaying}
                          className="rounded-md bg-emerald-500 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 transition-all duration-300 hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={handlePause}
                          disabled={!isPlaying}
                          className="rounded-md bg-uh-silver px-3 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 transition-all duration-300 hover:bg-zinc-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Pause
                        </button>
                        <button
                          type="button"
                          onClick={handleRestart}
                          className="rounded-md bg-uh-scarlet px-3 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-50 transition-all duration-300 hover:bg-uh-scarlet-dark active:scale-95"
                        >
                          Restart
                        </button>
                      </div>

                      {/* ── "Finish the Lyric" answer reveal ──
                          For audio_lyric clues, play from the snippet's stopTime
                          onward (the answer line) and keep playing until the host
                          presses Pause — no auto-stop. */}
                      {activeQuestion?.type === "audio_lyric" &&
                        activeTrack.stopTime !== null && (
                          <button
                            type="button"
                            onClick={handlePlayAnswer}
                            className="mt-2 w-full rounded-md border-2 border-emerald-400 bg-emerald-400/10 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-emerald-300 transition-all duration-300 hover:bg-emerald-400 hover:text-zinc-950 active:scale-95"
                          >
                            Play Answer (from {activeTrack.stopTime}s)
                          </button>
                        )}

                      <p className="mt-2 text-[0.6rem] text-zinc-500">
                        Snippet: {activeTrack.startTime}s
                        {activeTrack.stopTime !== null
                          ? ` to ${activeTrack.stopTime}s (auto-stops)`
                          : " to end"}
                        {activeQuestion?.type === "audio_lyric" &&
                          activeTrack.stopTime !== null &&
                          ` · Answer: ${activeTrack.stopTime}s → plays until paused`}
                      </p>
                    </div>
                  )}

                  {/* ── Family Feud answer board ── only for family_feud questions ──
                      Each row is a toggle: tap to reveal/hide that single answer
                      on the TV board (persisted to question.revealedAnswers). */}
                  {activeQuestion?.type === "family_feud" && activeQuestion.topAnswers && (
                    <div className="rounded-lg border border-uh-silver/20 bg-uh-charcoal p-3">
                      <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-uh-silver">
                        Top Answers — tap to reveal
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {activeQuestion.topAnswers.map((answer, index) => {
                          const revealed =
                            activeQuestion.revealedAnswers?.[index] ?? false;
                          return (
                            <button
                              key={answer}
                              type="button"
                              onClick={() => toggleRevealedAnswer(index)}
                              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all duration-300 active:scale-[0.99] ${
                                revealed
                                  ? "border-emerald-400 bg-emerald-500/15"
                                  : "border-uh-silver/15 bg-uh-charcoal-light hover:border-uh-scarlet"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="text-xs font-bold text-uh-scarlet">
                                  {index + 1}
                                </span>
                                <span className="truncate text-xs text-zinc-200">
                                  {answer}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide ${
                                  revealed
                                    ? "bg-emerald-500/25 text-emerald-300"
                                    : "bg-uh-silver/15 text-uh-silver"
                                }`}
                              >
                                {revealed ? "Revealed" : "Hidden"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Answer options */}
                  {options.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {options.map((option) => {
                        const isCorrect = option === activeCorrectAnswer;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => selectAnswer(option)}
                            className={`rounded-lg border-2 p-3 text-left text-xs font-semibold transition-all duration-300 ${
                              option === selectedAnswer
                                ? "border-uh-scarlet bg-uh-scarlet/15 text-uh-scarlet"
                                : "border-uh-silver/25 bg-uh-charcoal text-zinc-200 hover:border-uh-scarlet"
                            }`}
                          >
                            {isCorrect && (
                              <span className="mr-1 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-400">
                                [correct]
                              </span>
                            )}
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Dynamic point awarding ── reads the ACTIVE question's points */}
                  <div className="rounded-lg border border-uh-scarlet/30 bg-uh-charcoal p-3">
                    <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-uh-silver">
                      Award{" "}
                      <span className="text-uh-scarlet">{activePoints} pts</span>{" "}
                      for this question
                    </p>

                    {teamEntries.length === 0 ? (
                      <p className="text-xs text-zinc-500">No teams checked in.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {teamEntries.map(([teamId, team]) => (
                          <div
                            key={teamId}
                            className="flex items-center justify-between gap-2 rounded-md border border-uh-silver/15 bg-uh-charcoal-light px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-zinc-50">{team.name}</p>
                              <p className="text-[0.65rem] text-zinc-400">
                                Score: <span className="font-bold text-uh-scarlet">{team.score}</span>
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <button
                                type="button"
                                onClick={() => adjustScore(teamId, team.score, activePoints)}
                                disabled={activePoints === 0}
                                className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-black text-zinc-950 transition-all duration-300 hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                +{activePoints}
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustScore(teamId, team.score, -activePoints)}
                                disabled={activePoints === 0}
                                className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-black text-zinc-950 transition-all duration-300 hover:bg-rose-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                -{activePoints}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reveal */}
                  <button
                    type="button"
                    onClick={revealCorrectAnswer}
                    className="rounded-lg bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition-all duration-300 hover:bg-emerald-400 active:scale-[0.98]"
                  >
                    Reveal Answer
                  </button>

                  {/* Resolve: mark done vs. undo back to board */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={backToBoard}
                      className="rounded-lg bg-uh-scarlet px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-50 transition-all duration-300 hover:bg-uh-scarlet-dark active:scale-[0.98]"
                    >
                      Done - Back to Board
                    </button>
                    <button
                      type="button"
                      onClick={undoQuestion}
                      className="rounded-lg border-2 border-amber-400 bg-amber-400/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-amber-300 transition-all duration-300 hover:bg-amber-400 hover:text-zinc-950 active:scale-[0.98]"
                    >
                      Reset / Undo Question
                    </button>
                  </div>
                </div>
              );
            })()
          ) : totalQuestionCount === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">
              No questions loaded. Seed the database below.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {/* Board-matching grid — columns = categories, rows = point
                  tiers (ascending), mirroring the TV board layout exactly
                  so a tile's position here matches its position on screen. */}
              {boardCategories.length > 0 && (
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${boardCategories.length}, minmax(0, 1fr))`,
                    gridTemplateRows: `auto repeat(${maxBoardRows}, minmax(0, 1fr))`,
                  }}
                >
                  {boardCategories.map(({ category }) => (
                    <div
                      key={`header-${category}`}
                      className="flex items-center justify-center rounded-lg bg-uh-scarlet px-1.5 py-1.5 text-center text-[0.6rem] font-bold uppercase tracking-wide leading-tight text-zinc-50"
                    >
                      {category}
                    </div>
                  ))}

                  {Array.from({ length: maxBoardRows }, (_, rowIdx) =>
                    boardCategories.map(({ category, questions: catQuestions }) => {
                      const entry = catQuestions[rowIdx];
                      if (!entry) {
                        return <div key={`empty-${category}-${rowIdx}`} />;
                      }
                      const [questionId, question] = entry;
                      return (
                        <button
                          key={questionId}
                          type="button"
                          onClick={() => selectQuestion(questionId)}
                          disabled={question.isAnswered}
                          className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-uh-silver/15 bg-uh-charcoal p-2 text-center transition-all duration-300 hover:border-uh-scarlet disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-uh-charcoal-light disabled:opacity-40"
                        >
                          <span
                            className="flex items-center gap-1 text-sm font-bold text-uh-scarlet"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {question.points} pts
                            {question.isMusicRound && (
                              <span className="rounded bg-uh-silver/20 px-1 text-[0.55rem] font-semibold uppercase tracking-wide text-uh-silver">
                                Music
                              </span>
                            )}
                          </span>
                          <span className="line-clamp-2 text-[0.65rem] text-zinc-300">
                            {question.questionText}
                          </span>
                          {question.isAnswered && (
                            <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-600">
                              Done
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Final Jeopardy — its own section, kept separate from the
                  board grid above since it never appears as a tile on the board. */}
              {finalJeopardyEntry && (
                <div className="rounded-lg border-2 border-dashed border-amber-400/40 bg-amber-950/10 p-2.5">
                  <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-amber-300">
                    Final Jeopardy
                  </p>
                  {(() => {
                    const [questionId, question] = finalJeopardyEntry;
                    return (
                      <button
                        type="button"
                        onClick={() => selectQuestion(questionId)}
                        disabled={question.isAnswered}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-amber-400/30 bg-uh-charcoal p-3 text-left transition-all duration-300 hover:border-amber-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-uh-charcoal-light disabled:opacity-40"
                      >
                        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-uh-silver">
                          {question.category}
                        </span>
                        <span className="line-clamp-2 text-xs text-zinc-300">
                          {question.questionText}
                        </span>
                        {question.isAnswered && (
                          <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-600">
                            Done
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Final Jeopardy ── */}
      <section className="rounded-xl border border-amber-400/30 bg-amber-950/10 p-4 transition-all duration-300">
        <SectionHeading>Final Jeopardy</SectionHeading>

        {/* Phase transitions */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={startFinalWager}
            disabled={status === "final_wager"}
            className={finalPhaseBtnClass(status === "final_wager")}
          >
            1. Open Wagers
          </button>
          <button
            type="button"
            onClick={startFinalAnswer}
            disabled={status === "final_answer"}
            className={finalPhaseBtnClass(status === "final_answer")}
          >
            2. Open Answers
          </button>
          <button
            type="button"
            onClick={startFinalScoring}
            disabled={status === "final_scoring"}
            className={finalPhaseBtnClass(status === "final_scoring")}
          >
            3. Score Round
          </button>
          <button
            type="button"
            onClick={showPodium}
            disabled={status === "podium"}
            className={finalPhaseBtnClass(status === "podium")}
          >
            4. Show Podium
          </button>
        </div>

        {/* ── Open Answers reveal ──
            During the 'final_answer' phase, surface the Final Jeopardy clue
            here so the host can read it aloud to the room while captains type
            their answers on their phones. The clue never appears on the TV
            board, so this is the host's official copy. */}
        {status === "final_answer" && finalJeopardyEntry && (
          <div className="mt-3 rounded-lg border-2 border-amber-400/60 bg-amber-400/5 p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.25em] text-amber-300">
              Read Aloud — Final Jeopardy Clue
            </p>
            <p className="mt-2 text-base font-bold leading-snug text-zinc-50">
              {finalJeopardyEntry[1].questionText}
            </p>
            {finalJeopardyEntry[1].answerText && (
              <p className="mt-3 border-t border-amber-400/20 pt-2 text-xs text-zinc-400">
                <span className="font-bold uppercase tracking-widest text-uh-silver">
                  Host answer key:
                </span>{" "}
                <span className="font-semibold text-emerald-300">
                  {finalJeopardyEntry[1].answerText}
                </span>
              </p>
            )}
          </div>
        )}

        {teamEntries.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">No teams checked in yet.</p>
        ) : (
          <>
            {/* Read-only display of each team's submitted wager + answer for the host */}
            <div className="mt-3 flex flex-col gap-2">
              {teamEntries.map(([teamId, team]) => {
                const hasWager = team.finalWager !== undefined;
                const hasAnswer = (team.finalAnswer ?? "").trim().length > 0;
                return (
                  <div
                    key={teamId}
                    className="flex flex-col gap-2 rounded-lg border border-uh-silver/15 bg-uh-charcoal p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-zinc-50">{team.name}</p>
                      <div className="shrink-0">
                        <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-uh-silver">
                          Wager
                        </span>{" "}
                        <span
                          className={`text-sm font-black ${
                            hasWager ? "text-uh-scarlet" : "text-zinc-600"
                          }`}
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {hasWager ? team.finalWager : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Captain's submitted answer (for the host to read aloud) */}
                    <div className="flex items-center gap-2 rounded-md border border-uh-silver/10 bg-uh-charcoal-light px-2.5 py-1.5">
                      <span
                        className={`shrink-0 text-[0.6rem] font-bold uppercase tracking-widest ${
                          hasAnswer ? "text-emerald-400" : "text-zinc-600"
                        }`}
                      >
                        {hasAnswer ? "Answer" : "Awaiting"}
                      </span>
                      <span className="truncate text-xs text-zinc-200">
                        {hasAnswer ? team.finalAnswer : "No answer yet"}
                      </span>
                    </div>

                    {/* ── Manual grading ── host decides correct/incorrect, no string-matching */}
                    {status === "final_scoring" && (
                      <div className="flex items-center gap-2">
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              gradeFinalJeopardy(teamId, team.score, team.finalWager ?? 0, true)
                            }
                            className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-950 transition-all duration-300 hover:bg-emerald-400 active:scale-95"
                          >
                            Correct (+{team.finalWager ?? 0})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              gradeFinalJeopardy(teamId, team.score, team.finalWager ?? 0, false)
                            }
                            className="rounded-md bg-rose-500 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-950 transition-all duration-300 hover:bg-rose-400 active:scale-95"
                          >
                            Incorrect (-{team.finalWager ?? 0})
                          </button>
                        </div>
                        {team.finalCalculatedScore !== undefined && (
                          <>
                            <span className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs font-black text-emerald-300">
                              Final: {team.finalCalculatedScore}
                            </span>
                            <button
                              type="button"
                              onClick={() => undoFinalScore(teamId)}
                              className="shrink-0 rounded-md border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-300 transition-all duration-300 hover:bg-amber-400 hover:text-zinc-950 active:scale-95"
                            >
                              Undo
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lock answers */}
            <button
              type="button"
              onClick={toggleAnswersLock}
              className={`mt-3 w-full rounded-lg border-2 px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-all duration-300 active:scale-[0.98] ${
                answersLocked
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400 hover:text-zinc-950"
                  : "border-rose-500 bg-rose-500/10 text-rose-300 hover:bg-rose-500 hover:text-zinc-50"
              }`}
            >
              {answersLocked ? "Unlock Answers" : "Lock Answers"}
            </button>
          </>
        )}
      </section>

      {/* ── Team Management — editable names/roster + exact score override (always available) ── */}
      <section className="rounded-xl border border-uh-silver/20 bg-uh-charcoal-light p-4 transition-all duration-300">
        <SectionHeading>Team Management: Edit Names & Score Override</SectionHeading>

        {teamEntries.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No teams checked in yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {teamEntries.map(([teamId, team]) => {
              const draft = teamInfoDrafts[teamId];
              const nameValue = draft?.name ?? team.name;
              const captainValue = draft?.captain ?? team.captain;
              const membersValue = draft?.members ?? (team.members ?? []).join(", ");
              return (
                <div
                  key={teamId}
                  className="flex flex-col gap-3 rounded-lg border border-uh-silver/15 bg-uh-charcoal p-3 transition-all duration-300 hover:border-uh-scarlet/40"
                >
                  {/* ── Editable name / captain / roster ── */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="flex flex-1 flex-col gap-1">
                        <label
                          htmlFor={`team-name-${teamId}`}
                          className="text-[0.6rem] font-semibold uppercase tracking-widest text-uh-silver"
                        >
                          Team Name
                        </label>
                        <input
                          id={`team-name-${teamId}`}
                          type="text"
                          value={nameValue}
                          onChange={(e) => updateTeamInfoDraft(teamId, "name", e.target.value)}
                          className="w-full rounded-md border border-uh-silver/25 bg-uh-charcoal-light px-2.5 py-1.5 text-xs font-bold text-zinc-50 transition-all duration-300 focus-visible:border-uh-scarlet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-scarlet/60"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <label
                          htmlFor={`team-captain-${teamId}`}
                          className="text-[0.6rem] font-semibold uppercase tracking-widest text-uh-silver"
                        >
                          Captain
                        </label>
                        <input
                          id={`team-captain-${teamId}`}
                          type="text"
                          value={captainValue}
                          onChange={(e) =>
                            updateTeamInfoDraft(teamId, "captain", e.target.value)
                          }
                          className="w-full rounded-md border border-uh-silver/25 bg-uh-charcoal-light px-2.5 py-1.5 text-xs font-bold text-zinc-50 transition-all duration-300 focus-visible:border-uh-scarlet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-scarlet/60"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`team-members-${teamId}`}
                        className="text-[0.6rem] font-semibold uppercase tracking-widest text-uh-silver"
                      >
                        Players (comma-separated)
                      </label>
                      <input
                        id={`team-members-${teamId}`}
                        type="text"
                        value={membersValue}
                        onChange={(e) =>
                          updateTeamInfoDraft(teamId, "members", e.target.value)
                        }
                        className="w-full rounded-md border border-uh-silver/25 bg-uh-charcoal-light px-2.5 py-1.5 text-xs text-zinc-50 transition-all duration-300 focus-visible:border-uh-scarlet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-scarlet/60"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => saveTeamInfo(teamId)}
                      disabled={!draft}
                      className="self-start rounded-md bg-uh-scarlet px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-50 transition-all duration-300 hover:bg-uh-scarlet-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-scarlet/60"
                    >
                      Save
                    </button>
                  </div>

                  {/* ── Exact score override ── */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-uh-silver/10 pt-3">
                    <span className="mr-auto text-xs text-zinc-400">
                      Score:{" "}
                      <span className="font-bold text-uh-scarlet">{team.score}</span>
                    </span>
                    {/* Exact-value override: type any score and commit it. */}
                    <input
                      type="number"
                      inputMode="numeric"
                      value={scoreDrafts[teamId] ?? String(team.score)}
                      onChange={(e) =>
                        setScoreDrafts((prev) => ({ ...prev, [teamId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setExactScore(teamId);
                      }}
                      aria-label={`Set exact score for ${team.name}`}
                      className="w-24 rounded-md border border-uh-silver/25 bg-uh-charcoal-light px-2.5 py-1.5 text-xs font-bold text-zinc-50 transition-all duration-300 focus-visible:border-uh-scarlet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-scarlet/60"
                    />
                    <button
                      type="button"
                      onClick={() => setExactScore(teamId)}
                      className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 transition-all duration-300 hover:bg-emerald-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-uh-charcoal"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTeam(teamId)}
                      className="rounded-md border border-uh-silver/25 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-all duration-300 hover:border-rose-400 hover:text-rose-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uh-silver/50 focus-visible:ring-offset-2 focus-visible:ring-offset-uh-charcoal"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Danger Zone ── */}
      <section className="rounded-xl border-2 border-dashed border-rose-500/60 bg-rose-950/20 p-4 transition-all duration-300">
        <SectionHeading>Danger Zone: Setup Tool</SectionHeading>
        <p className="mt-1 text-[0.65rem] text-rose-200/70">
          Overwrites the entire <code>questions</code> node with the final {SEED_QUESTION_COUNT}-question
          set, including Final Jeopardy.
        </p>
        <button
          type="button"
          onClick={seedDatabase}
          className="mt-2.5 rounded-lg border-2 border-rose-400 bg-rose-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-rose-300 transition-all duration-300 hover:bg-rose-500 hover:text-zinc-50 active:scale-[0.98]"
        >
          Seed Database
        </button>
      </section>
    </div>
  );
}
