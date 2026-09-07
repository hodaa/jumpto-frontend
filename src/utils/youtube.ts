/** URL helpers for YouTube links and identifiers. */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);

export type YouTubeUrlIssue = 'invalid' | 'unsupportedSource' | 'unsupportedFormat';

type YouTubeUrlInfo =
  | { id: string; issue: null }
  | { id: null; issue: YouTubeUrlIssue };

/**
 * Only accept the watch/share formats currently offered by the search form.
 * Distinguish unsupported sources/formats so the form can explain how to fix a link.
 */
export function inspectYouTubeUrl(url: string): YouTubeUrlInfo {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return { id: null, issue: 'invalid' };
    }
    let id: string | null;
    if (parsed.hostname === 'youtu.be') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length !== 1) return { id: null, issue: 'unsupportedFormat' };
      id = parts[0];
    } else if (YOUTUBE_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith('.youtube.com')) {
      if (parsed.pathname !== '/watch') return { id: null, issue: 'unsupportedFormat' };
      id = parsed.searchParams.get('v');
    } else {
      return { id: null, issue: 'unsupportedSource' };
    }
    return id && YOUTUBE_ID_REGEX.test(id)
      ? { id, issue: null }
      : { id: null, issue: 'invalid' };
  } catch {
    return { id: null, issue: 'invalid' };
  }
}

/** Extract the 11-character id from a supported YouTube URL. */
export function parseYouTubeId(url: string): string | null {
  return inspectYouTubeUrl(url).id;
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
