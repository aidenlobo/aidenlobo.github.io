"use server";

import { getSpotifyAccessToken } from "@/lib/spotify";

export async function playGameTrack(trackUri: string, startTimeMs: number): Promise<void> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    console.error("[Spotify] playGameTrack: No access token — skipping playback.");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [trackUri], position_ms: startTimeMs }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No active Spotify device — not a game-breaking error.
        return;
      }
      const errorText = await response.text();
      console.error(`[Spotify] playGameTrack failed (${response.status}): ${errorText}`);
    }
  } catch (error) {
    console.error("[Spotify] playGameTrack network error:", error);
  }
}

export async function pauseGameTrack(): Promise<void> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    console.error("[Spotify] pauseGameTrack: No access token — skipping pause.");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No active device to pause — safe to ignore.
        return;
      }
      const errorText = await response.text();
      console.error(`[Spotify] pauseGameTrack failed (${response.status}): ${errorText}`);
    }
  } catch (error) {
    console.error("[Spotify] pauseGameTrack network error:", error);
  }
}