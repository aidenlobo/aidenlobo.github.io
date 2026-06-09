"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";

export interface GameState {
  status: "welcome" | "lobby" | "board";
  currentQuestionId: string | null;
  revealAnswer?: boolean;
  selectedAnswer?: string | null;
}

export interface Team {
  name: string;
  captain: string;
  members: string[];
  score: number;
}

export type Teams = Record<string, Team>;

export interface Question {
  category: string;
  points: number;
  type: "jeopardy" | "kahoot";
  questionText: string;
  answerText: string;
  isAnswered: boolean;
  options?: string[];
  correctAnswer?: string;
  spotifyTrackUri?: string;
  playbackStartTimeMs?: number;
  isMusicRound?: boolean;
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