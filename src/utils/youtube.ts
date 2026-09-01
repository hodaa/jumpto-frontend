/** URL helpers for YouTube links and identifiers. */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);

/** Extract the 11-character YouTube video id from a URL, or null when invalid. */
export function parseYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname === 'youtu.be') {
      const first = parsed.pathname.split('/').filter(Boolean)[0];
      id = first ?? null;
    } else if (YOUTUBE_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith('.youtube.com')) {
      id = parsed.searchParams.get('v');
    }
    if (id && YOUTUBE_ID_REGEX.test(id)) {
      return id;
    }
  } catch {
    return null;
  }
  return null;
}

/** Build a YouTube watch URL that starts playback at the given second. */
export function buildWatchUrl(youtubeId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}&t=${Math.floor(seconds)}`;
}

/**
 * Format a timestamp the way the YouTube player controls do:
 * `MM:SS`, or `HH:MM:SS` once the duration reaches an hour.
 * Non-finite or negative input falls back to `00:00`.
 */
export function formatYouTubeTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    totalSeconds = 0;
  }
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
