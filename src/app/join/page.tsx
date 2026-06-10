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

  /* ── Loading session check ── */
  if (checkingSession) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center">
        <p className="text-7xl select-none" role="img" aria-label="paw prints">
          🐾
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 rounded-full border-2 border-uh-silver/30 border-t-uh-scarlet"
            style={{ animation: "spin-loader 0.8s linear infinite" }}
          />
          <h1
            className="uppercase text-uh-scarlet"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 8vw, 3.5rem)",
              letterSpacing: "0.08em",
            }}
          >
            Loading...
          </h1>
          <p
            className="text-sm font-medium text-uh-silver/70"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Checking your session
          </p>
        </div>
      </div>
    );
  }

  /* ── Already submitted ── */
  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, #10b981, transparent)",
          }}
        />
        <p className="text-6xl select-none">🎉</p>
        <h1
          className="mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl"
          style={{ fontFamily: "var(--font-body)" }}
        >
          You are{" "}
          <span className="text-emerald-400">checked in!</span>
        </h1>
        <p
          className="mt-4 text-xl font-medium text-uh-silver"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Look at the big screen.
        </p>
        <div className="mt-6 h-0.5 w-24 rounded-full bg-emerald-500/50" />
      </div>
    );
  }

  /* ── Game not in lobby ── */
  if (gameState && gameState.status !== "lobby") {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-uh-charcoal px-6 text-center">
        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, #c8102e, transparent)",
          }}
        />
        <p className="text-7xl select-none" role="img" aria-label="timer">
          ⏱️
        </p>
        <h1
          className="mt-5 uppercase leading-none text-uh-scarlet"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
            letterSpacing: "0.06em",
          }}
        >
          Hold Tight!
        </h1>
        <div className="welcome-bar mt-5 w-32" />
        <p
          className="mt-6 max-w-xs text-base font-medium text-uh-silver sm:text-lg"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Registration hasn&apos;t started yet.
          <br />
          Listen to the host for instructions.
        </p>
      </div>
    );
  }

  /* ── Registration Form ── */
  return (
    <div
      className="flex flex-1 flex-col bg-uh-charcoal px-4 py-10 sm:px-6"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="mx-auto w-full max-w-md">
        {/* Eyebrow */}
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-uh-scarlet">
          Coog Jeopardy
        </p>

        {/* Page title */}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
          Join the Game
        </h1>
        <p className="mt-2 text-sm text-uh-silver">
          Register your team. You&apos;ll need a team name, a captain, and at
          least {MIN_MEMBERS} members.
        </p>

        {/* Divider */}
        <div className="mt-6 h-px bg-uh-silver/15" />

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-7">
          {/* Team Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="teamName"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-uh-silver"
            >
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="The Graduates"
              className="input-underline"
            />
          </div>

          {/* Captain Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="captainName"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-uh-silver"
            >
              Captain Name
            </label>
            <input
              id="captainName"
              type="text"
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              placeholder="John"
              className="input-underline"
            />
          </div>

          {/* Team Members */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-uh-silver">
                Team Members
              </span>
              <span className="text-[0.65rem] text-uh-silver/60">
                {filledMembers.length}/{MAX_MEMBERS} (min {MIN_MEMBERS})
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {members.map((member, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => updateMember(index, e.target.value)}
                      placeholder={`Member ${index + 1}`}
                      className="input-underline"
                    />
                  </div>
                  {members.length > MIN_MEMBERS && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-uh-silver/25 text-uh-silver/60 transition-all duration-300 hover:border-uh-scarlet hover:text-uh-scarlet"
                      aria-label={`Remove member ${index + 1}`}
                    >
                      <span className="text-xs leading-none">✕</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {members.length < MAX_MEMBERS && (
              <button
                type="button"
                onClick={addMember}
                className="mt-1 rounded-lg border border-dashed border-uh-silver/25 px-4 py-2.5 text-xs font-medium text-uh-silver transition-all duration-300 hover:border-uh-scarlet hover:text-uh-scarlet"
              >
                + Add another member
              </button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="join-submit-btn"
            type="submit"
            disabled={!canSubmit}
            className={`
              w-full rounded-xl px-5 py-4 text-sm font-black uppercase tracking-widest
              transition-all duration-300 ease-in-out
              ${
                submitting
                  ? "cursor-wait bg-uh-scarlet opacity-70"
                  : canSubmit
                  ? "bg-uh-scarlet text-zinc-50 hover:bg-uh-scarlet-dark active:scale-[0.98]"
                  : "cursor-not-allowed bg-uh-silver/15 text-uh-silver/40"
              }
            `}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                Submitting...
              </span>
            ) : (
              "Let's Play →"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
