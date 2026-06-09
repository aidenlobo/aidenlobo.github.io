import "server-only";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function getSpotifyAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error(
      "[Spotify] Missing required environment variables. Ensure SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN are set."
    );
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Spotify] Token refresh failed (${response.status}): ${errorText}`
      );
      return null;
    }

    const data = await response.json();
    const accessToken = data.access_token as string;
    const expiresInMs = (data.expires_in as number) * 1000;

    cachedToken = {
      accessToken,
      // Refresh a minute early to avoid using a token that expires mid-request.
      expiresAt: Date.now() + expiresInMs - 60_000,
    };

    return accessToken;
  } catch (error) {
    console.error("[Spotify] Network error during token refresh:", error);
    return null;
  }
}