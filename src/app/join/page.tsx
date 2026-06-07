"use client";

import { useState } from "react";
import { push, ref, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { useGameState } from "@/hooks/useGameState";

const MAX_MEMBERS = 5;
const MIN_MEMBERS = 2;

export default function JoinPage() {
  const { gameState } = useGameState();
  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const filledMembers = members.map((m) => m.trim()).filter((m) => m.length > 0);

  const canSubmit =
    teamName.trim().length > 0 &&
    captainName.trim().length > 0 &&
    filledMembers.length >= MIN_MEMBERS &&
    !submitting;

  const updateMember = (index: number, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? value : m)));
  };

  const addMember = () => {
    setMembers((prev) => (prev.length < MAX_MEMBERS ? [...prev, ""] : prev));
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const teamsRef = ref(database, "teams");
      const newTeamRef = push(teamsRef);
      await set(newTeamRef, {
        name: teamName.trim(),
        captain: captainName.trim(),
        members: filledMembers,
        score: 0,
      });
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong submitting your team. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
        <p className="text-6xl">🎉</p>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
          You are checked in!
        </h1>
        <p className="mt-4 text-2xl font-medium text-zinc-600 dark:text-zinc-400">
          Look at the big screen.
        </p>
      </div>
    );
  }

  if (gameState && gameState.status !== "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
        <p className="text-6xl">⏳</p>
        <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
          Hold tight!
        </h1>
        <p className="mt-4 text-xl font-medium text-zinc-600 dark:text-zinc-400">
          Registration hasn&apos;t started yet. Listen to the host for
          instructions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Join the Game
        </h1>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Register your team to play. You&apos;ll need a team name, a captain,
          and at least {MIN_MEMBERS} members.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="teamName"
              className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="The Graduates"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="captainName"
              className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Captain Name
            </label>
            <input
              id="captainName"
              type="text"
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              placeholder="John"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Team Members
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {filledMembers.length}/{MAX_MEMBERS} (min {MIN_MEMBERS})
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {members.map((member, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updateMember(index, e.target.value)}
                    placeholder={`Member ${index + 1}`}
                    className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  {members.length > MIN_MEMBERS && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      aria-label={`Remove member ${index + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {members.length < MAX_MEMBERS && (
              <button
                type="button"
                onClick={addMember}
                className="mt-1 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                + Add another member
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-zinc-950 px-5 py-4 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-50 dark:text-zinc-950 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}