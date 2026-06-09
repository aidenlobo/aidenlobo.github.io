"use client";

import { useEffect, useState } from "react";
import { get, push, ref, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { useGameState } from "@/hooks/useGameState";

const MAX_MEMBERS = 5;
const MIN_MEMBERS = 2;
const TEAM_ID_STORAGE_KEY = "teamId";

export default function JoinPage() {
  const { gameState } = useGameState();
  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const storedTeamId = localStorage.getItem(TEAM_ID_STORAGE_KEY);

    const checkExistingTeam = storedTeamId
      ? get(ref(database, `teams/${storedTeamId}`)).then((snapshot) => {
          if (snapshot.exists()) {
            setSubmitted(true);
          } else {
            localStorage.removeItem(TEAM_ID_STORAGE_KEY);
          }
        })
      : Promise.resolve();

    checkExistingTeam
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, []);

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
      if (newTeamRef.key) {
        localStorage.setItem(TEAM_ID_STORAGE_KEY, newTeamRef.key);
      }
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong submitting your team. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center transition-all duration-300 ease-in-out">
        <p className="animate-pulse text-2xl font-bold uppercase tracking-[0.3em] text-uh-silver">
          Loading...
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center transition-all duration-300 ease-in-out">
        <p className="text-6xl">🎉</p>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl">
          You are checked in!
        </h1>
        <p className="mt-4 text-2xl font-medium text-uh-silver">
          Look at the big screen.
        </p>
      </div>
    );
  }

  if (gameState && gameState.status !== "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center transition-all duration-300 ease-in-out">
        <p className="text-6xl">⏳</p>
        <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-4xl">
          Hold tight!
        </h1>
        <p className="mt-4 text-xl font-medium text-uh-silver">
          Registration hasn&apos;t started yet. Listen to the host for
          instructions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-uh-charcoal px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-uh-scarlet">
          Coog Jeopardy
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
          Join the Game
        </h1>
        <p className="mt-2 text-base text-uh-silver">
          Register your team to play. You&apos;ll need a team name, a captain,
          and at least {MIN_MEMBERS} members.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="teamName"
              className="text-sm font-semibold text-zinc-200"
            >
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="The Graduates"
              className="rounded-xl border border-uh-silver/30 bg-uh-charcoal-light px-4 py-3 text-base text-zinc-50 outline-none transition-all duration-300 ease-in-out focus:border-uh-scarlet"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="captainName"
              className="text-sm font-semibold text-zinc-200"
            >
              Captain Name
            </label>
            <input
              id="captainName"
              type="text"
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              placeholder="John"
              className="rounded-xl border border-uh-silver/30 bg-uh-charcoal-light px-4 py-3 text-base text-zinc-50 outline-none transition-all duration-300 ease-in-out focus:border-uh-scarlet"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-200">
                Team Members
              </span>
              <span className="text-xs text-uh-silver">
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
                    className="flex-1 rounded-xl border border-uh-silver/30 bg-uh-charcoal-light px-4 py-3 text-base text-zinc-50 outline-none transition-all duration-300 ease-in-out focus:border-uh-scarlet"
                  />
                  {members.length > MIN_MEMBERS && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-uh-silver/30 text-uh-silver transition-all duration-300 ease-in-out hover:border-uh-scarlet hover:text-uh-scarlet"
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
                className="mt-1 rounded-xl border border-dashed border-uh-silver/30 px-4 py-3 text-sm font-medium text-uh-silver transition-all duration-300 ease-in-out hover:border-uh-scarlet hover:text-uh-scarlet"
              >
                + Add another member
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm font-medium text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-uh-scarlet px-5 py-4 text-base font-bold uppercase tracking-wide text-zinc-50 transition-all duration-300 ease-in-out hover:bg-uh-scarlet/90 disabled:cursor-not-allowed disabled:bg-uh-silver/20 disabled:text-uh-silver"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
