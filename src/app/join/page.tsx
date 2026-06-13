"use client";

import { useEffect, useState } from "react";
import { get, push, ref, set, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useGameState } from "@/hooks/useGameState";

const MAX_MEMBERS = 5;
const MIN_MEMBERS = 2;
const TEAM_ID_STORAGE_KEY = "teamId";

export default function JoinPage() {
  const { gameState, teams } = useGameState();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Final Jeopardy: captain-entered wager + answer
  const [wagerDraft, setWagerDraft] = useState("");
  const [wagerSeeded, setWagerSeeded] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerSeeded, setAnswerSeeded] = useState(false);

  useEffect(() => {
    const storedTeamId = localStorage.getItem(TEAM_ID_STORAGE_KEY);

    const checkExistingTeam = storedTeamId
      ? get(ref(database, `teams/${storedTeamId}`)).then((snapshot) => {
          if (snapshot.exists()) {
            setTeamId(storedTeamId);
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

  const status = gameState?.status;
  const answersLocked = gameState?.answersLocked ?? false;
  const myTeam = teamId && teams ? teams[teamId] ?? null : null;
  const savedAnswer = myTeam?.finalAnswer ?? "";

  // Seed the wager input once from any previously-saved wager.
  useEffect(() => {
    if (!wagerSeeded && myTeam) {
      setWagerDraft(myTeam.finalWager !== undefined ? String(myTeam.finalWager) : "");
      setWagerSeeded(true);
    }
  }, [wagerSeeded, myTeam]);

  // Seed the answer input once from any previously-saved answer.
  useEffect(() => {
    if (!answerSeeded && savedAnswer) {
      setAnswerDraft(savedAnswer);
      setAnswerSeeded(true);
    }
  }, [answerSeeded, savedAnswer]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const trimmedName = teamName.trim();
    const nameTaken = teams
      ? Object.values(teams).some(
          (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
        )
      : false;
    if (nameTaken) {
      setError("That team name is already taken. Please choose another.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const teamsRef = ref(database, "teams");
      const newTeamRef = push(teamsRef);
      await set(newTeamRef, {
        name: trimmedName,
        captain: captainName.trim(),
        members: filledMembers,
        score: 0,
      });
      if (newTeamRef.key) {
        localStorage.setItem(TEAM_ID_STORAGE_KEY, newTeamRef.key);
        setTeamId(newTeamRef.key);
      }
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong submitting your team. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Final Jeopardy wager math ──
     A team may risk anywhere from 0 up to its current score. */
  const currentScore = myTeam?.score ?? 0;
  const maxWager = Math.max(0, currentScore);
  const wagerValue = (() => {
    if (wagerDraft.trim() === "") return 0;
    const parsed = Number(wagerDraft);
    if (Number.isNaN(parsed)) return 0;
    return Math.min(Math.max(0, Math.floor(parsed)), maxWager);
  })();
  const projectedRight = currentScore + wagerValue;
  const projectedWrong = currentScore - wagerValue;

  const handleWagerChange = (raw: string) => {
    // Digits only — clamp to the team's current score.
    const cleaned = raw.replace(/[^\d]/g, "");
    setWagerDraft(cleaned);
    if (!teamId) return;
    const next = cleaned === "" ? 0 : Math.min(Number(cleaned), maxWager);
    void update(ref(database, `teams/${teamId}`), { finalWager: next });
  };

  const handleAnswerChange = (value: string) => {
    setAnswerDraft(value);
    if (!teamId || answersLocked) return;
    void update(ref(database, `teams/${teamId}`), { finalAnswer: value });
  };

  /* ── Loading session check ── */
  if (checkingSession) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-uh-charcoal px-6 text-center">
        <div className="flex flex-col items-center gap-3">
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

  /* ── Final Jeopardy: WAGER phase (registered captains) ── */
  if (submitted && status === "final_wager") {
    return (
      <div
        className="relative flex flex-1 flex-col bg-uh-charcoal px-5 py-10"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 0%, #c8102e, transparent)",
          }}
        />
        <div className="mx-auto w-full max-w-md">
          <TimerBar endsAt={gameState?.timerEndsAt} />
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-uh-scarlet">
            Final Jeopardy
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            Place Your Wager
          </h1>
          <p className="mt-2 text-sm text-uh-silver">
            Captain of {myTeam?.name ?? "your team"}, risk anywhere from 0 up to your
            current score.
          </p>

          {/* Wager input */}
          <div className="mt-7 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="wager"
                className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-uh-silver"
              >
                Your Wager
              </label>
              <span className="text-[0.65rem] text-uh-silver/60">
                Max {maxWager}
              </span>
            </div>
            <input
              id="wager"
              type="text"
              inputMode="numeric"
              value={wagerDraft}
              onChange={(e) => handleWagerChange(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-uh-silver/30 bg-uh-charcoal-light px-4 py-4 text-center text-3xl font-black text-uh-scarlet outline-none transition-all duration-300 focus:border-uh-scarlet"
              style={{ fontFamily: "var(--font-display)" }}
            />
            {wagerDraft.trim() !== "" && Number(wagerDraft) > maxWager && (
              <p className="text-xs font-medium text-amber-400">
                Capped at your current score ({maxWager}).
              </p>
            )}
          </div>

          {/* Live projection */}
          <div className="mt-7 grid grid-cols-3 gap-2.5">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-uh-silver/20 bg-uh-charcoal-light px-2 py-4 text-center">
              <span className="text-[0.55rem] font-semibold uppercase tracking-widest text-uh-silver">
                Current
              </span>
              <span
                className="text-zinc-50"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", lineHeight: 1 }}
              >
                {currentScore}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2 py-4 text-center">
              <span className="text-[0.55rem] font-semibold uppercase tracking-widest text-emerald-300">
                If Correct
              </span>
              <span
                className="text-emerald-400"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", lineHeight: 1 }}
              >
                {projectedRight}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2 py-4 text-center">
              <span className="text-[0.55rem] font-semibold uppercase tracking-widest text-rose-300">
                If Wrong
              </span>
              <span
                className="text-rose-400"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", lineHeight: 1 }}
              >
                {projectedWrong}
              </span>
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-medium text-emerald-400">
            Your wager saves automatically as you type.
          </p>
        </div>
      </div>
    );
  }

  /* ── Final Jeopardy: ANSWER phase (registered captains) ── */
  if (submitted && status === "final_answer") {
    return (
      <div
        className="relative flex flex-1 flex-col bg-uh-charcoal px-5 py-10"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 0%, #c8102e, transparent)",
          }}
        />
        <div className="mx-auto w-full max-w-md">
          <TimerBar endsAt={gameState?.timerEndsAt} />
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-uh-scarlet">
            Final Jeopardy
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            {answersLocked ? "Answers Locked" : "Your Final Answer"}
          </h1>
          <p className="mt-2 text-sm text-uh-silver">
            {answersLocked
              ? "The host has locked all answers. Good luck!"
              : `Captain of ${myTeam?.name ?? "your team"}, type your final answer below. It saves automatically.`}
          </p>

          <div className="mt-7 flex flex-col gap-1.5">
            <label
              htmlFor="finalAnswer"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-uh-silver"
            >
              Final Answer
            </label>
            <textarea
              id="finalAnswer"
              value={answerDraft}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={answersLocked}
              rows={3}
              placeholder="Type your team's answer..."
              className={`w-full resize-none rounded-xl border bg-uh-charcoal-light px-4 py-3 text-base text-zinc-50 outline-none transition-all duration-300 ${
                answersLocked
                  ? "cursor-not-allowed border-uh-silver/15 opacity-60"
                  : "border-uh-silver/30 focus:border-uh-scarlet"
              }`}
            />
          </div>

          {answersLocked ? (
            <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-300">
                Submitted and Locked
              </p>
              <p className="mt-2 text-lg font-bold text-zinc-50">
                {savedAnswer || "no answer submitted"}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-center text-xs font-medium text-emerald-400">
              Your answer saves automatically as you type.
            </p>
          )}
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
        <TimerBar endsAt={gameState?.timerEndsAt} />
        <h1
          className="text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl"
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
        <TimerBar endsAt={gameState?.timerEndsAt} />
        <h1
          className="uppercase leading-none text-uh-scarlet"
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
        <TimerBar endsAt={gameState?.timerEndsAt} />
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
                      className="mb-1 flex h-7 shrink-0 items-center justify-center rounded-full border border-uh-silver/25 px-3 text-[0.6rem] font-semibold uppercase tracking-wide text-uh-silver/60 transition-all duration-300 hover:border-uh-scarlet hover:text-uh-scarlet"
                      aria-label={`Remove member ${index + 1}`}
                    >
                      Remove
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
              "Let's Play"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Visual countdown — mirrors gameState.timerEndsAt, set by the Admin's
   "Start 15s Timer" button. Purely informational: it never auto-submits
   or disables inputs, even after it reaches zero (it simply disappears).
───────────────────────────────────────────── */
const TIMER_DURATION_MS = 15000;

function TimerBar({ endsAt }: { endsAt?: number }) {
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
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="mx-auto mb-6 w-full max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-uh-silver">
          Time Remaining
        </span>
        <span
          className="text-sm font-black text-uh-scarlet"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {seconds}s
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-uh-charcoal-light">
        <div
          className="h-full rounded-full bg-uh-scarlet transition-all duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
