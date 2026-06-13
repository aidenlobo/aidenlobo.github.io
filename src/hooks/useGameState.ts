"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";

export interface SpotifyState {
  /** Whether the host device should currently be playing. */
  isPlaying: boolean;
  /** Spotify track URI currently loaded (e.g. "spotify:track:..."), or null. */
  trackUri: string | null;
  /** Playback start offset, in SECONDS (matches the question schema). */
  startTime: number;
  /** Auto-stop offset, in SECONDS, or null for "play to the end". */
  stopTime: number | null;
  /**
   * Epoch ms marking when playback last (re)started from `startTime`.
   * Used to compute how long until `stopTime` is reached.
   */
  updatedAt: number;
}

export interface GameState {
  status:
    | "welcome"
    | "lobby"
    | "board"
    | "final_wager"
    | "final_answer"
    | "final_scoring"
    | "podium";
  currentQuestionId: string | null;
  revealAnswer?: boolean;
  selectedAnswer?: string | null;
  spotifyState?: SpotifyState;
  /** Final Jeopardy: once true, captains can no longer edit their final answer. */
  answersLocked?: boolean;
  /**
   * Epoch ms at which the on-screen 15-second countdown timer should hit zero.
   * Written by the Admin's "Start 15s Timer" button (Date.now() + 15000) and
   * read by the TV board to render a visual countdown.
   */
  timerEndsAt?: number;
}

export interface Team {
  name: string;
  captain: string;
  members: string[];
  score: number;
  /** Final Jeopardy wager, tracked manually by the Admin. */
  finalWager?: number;
  /** Final Jeopardy answer, submitted by the team captain. */
  finalAnswer?: string;
  /**
   * Final Jeopardy result, manually confirmed by the Admin during
   * 'final_scoring' (score + finalWager if correct, score - finalWager
   * if incorrect). The podium ranks teams by this value.
   */
  finalCalculatedScore?: number;
}

export type Teams = Record<string, Team>;

export interface Question {
  category: string;
  points: number;
  type:
    | "jeopardy"
    | "kahoot"
    | "multiple_choice"
    | "true_false"
    | "fill_blank"
    | "audio_lyric"
    | "family_feud"
    | "final_jeopardy";
  questionText: string;
  /** Not present on family_feud questions, which use `topAnswers` instead. */
  answerText?: string;
  isAnswered: boolean;
  options?: string[];
  correctAnswer?: string;
  /** Family Feud round: the top crowd-sourced answers, in priority order. */
  topAnswers?: string[];
  /**
   * Family Feud round: per-answer reveal state, index-aligned with
   * `topAnswers`. The host toggles each entry individually from the Admin
   * panel so answers can be unveiled one at a time on the TV board.
   */
  revealedAnswers?: boolean[];
  isMusicRound?: boolean;
  /** Spotify track URI for music rounds (schema field). */
  spotifyUri?: string;
  /** Playback start offset, in SECONDS (schema field). */
  startTime?: number;
  /** Auto-stop offset, in SECONDS (schema field). */
  stopTime?: number;
  /** @deprecated legacy fields — superseded by spotifyUri / startTime. */
  spotifyTrackUri?: string;
  playbackStartTimeMs?: number;
}

export type Questions = Record<string, Question>;

export interface UseGameStateResult {
  gameState: GameState | null;
  teams: Teams | null;
  questions: Questions | null;
  loading: boolean;
}

export function useGameState(): UseGameStateResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [teams, setTeams] = useState<Teams | null>(null);
  const [questions, setQuestions] = useState<Questions | null>(null);
  const [gameStateLoaded, setGameStateLoaded] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  useEffect(() => {
    const gameStateRef = ref(database, "gameState");
    const teamsRef = ref(database, "teams");
    const questionsRef = ref(database, "questions");

    const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
      setGameState(snapshot.val());
      setGameStateLoaded(true);
    });

    const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
      setTeams(snapshot.val());
      setTeamsLoaded(true);
    });

    const unsubscribeQuestions = onValue(questionsRef, (snapshot) => {
      setQuestions(snapshot.val());
      setQuestionsLoaded(true);
    });

    return () => {
      unsubscribeGameState();
      unsubscribeTeams();
      unsubscribeQuestions();
    };
  }, []);

  return {
    gameState,
    teams,
    questions,
    loading: !(gameStateLoaded && teamsLoaded && questionsLoaded),
  };
}