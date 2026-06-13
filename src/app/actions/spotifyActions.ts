"use server";

import { getSpotifyAccessToken } from "@/lib/spotify";

/* ─────────────────────────────────────────────
   Spotify Web API Server Actions

   Every function here runs ONLY on the server (`"use server"`)
   so the Spotify client secret / refresh token never reach the
   browser. The Admin panel calls these to drive the host device's
   playback (Play, Pause, Restart-from-timestamp, Seek).

   The Web API targets the user's currently-active Spotify device.
   A 404 means "no active device" — a recoverable, non-fatal state
   the Admin UI surfaces as a retryable warning, never a crash.
───────────────────────────────────────────── */

const SPOTIFY_API = "https://api.spotify.com/v1";

export type SpotifyActionResult =
  | { ok: true }
  | { ok: false; reason: "no_token" | "no_device" | "error" };

/** Shared transport helper: authenticate, hit the player endpoint, normalize the result. */
async function callPlayer(
  endpoint: string,
  method: "PUT" | "POST",
  label: string,
  body?: unknown
): Promise<SpotifyActionResult> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    console.error(`[Spotify] ${label}: No access token — skipping.`);
    return { ok: false, reason: "no_token" };
  }

  try {
    const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No active Spotify device — not a game-breaking error.
        return { ok: false, reason: "no_device" };
      }
      const errorText = await response.text();
      console.error(`[Spotify] ${label} failed (${response.status}): ${errorText}`);
      return { ok: false, reason: "error" };
    }

    return { ok: true };
  } catch (error) {
    console.error(`[Spotify] ${label} network error:`, error);
    return { ok: false, reason: "error" };
  }
}

/**
 * Start a specific track at a given offset. Used for the initial play of a
 * music question and for "Restart" (re-seek to the snippet's startTime).
 */
export async function playGameTrack(
  trackUri: string,
  startTimeMs: number
): Promise<SpotifyActionResult> {
  return callPlayer("/me/player/play", "PUT", "playGameTrack", {
    uris: [trackUri],
    position_ms: startTimeMs,
  });
}

/** Resume whatever is currently loaded on the active device (manual "Play"). */
export async function resumeGameTrack(): Promise<SpotifyActionResult> {
  return callPlayer("/me/player/play", "PUT", "resumeGameTrack");
}

/** Pause the active device (manual "Pause" and the "Finish the Lyric" auto-stop). */
export async function pauseGameTrack(): Promise<SpotifyActionResult> {
  return callPlayer("/me/player/pause", "PUT", "pauseGameTrack");
}

/**
 * Seek to an absolute position within the current track (manual "Restart from
 * timestamp" without reloading the track).
 */
export async function seekGameTrack(positionMs: number): Promise<SpotifyActionResult> {
  return callPlayer(
    `/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`,
    "PUT",
    "seekGameTrack"
  );
}
