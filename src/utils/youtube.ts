/** URL helpers for YouTube links and identifiers. */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);

export type YouTubeUrlIssue = 'invalid' | 'unsupportedSource' | 'unsupportedFormat';

type YouTubeUrlInfo = { id: string; issue: null } | { id: null; issue: YouTubeUrlIssue };

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
    return id && YOUTUBE_ID_REGEX.test(id) ? { id, issue: null } : { id: null, issue: 'invalid' };
  } catch {
    return { id: null, issue: 'invalid' };
  }
}

/** Extract the 11-character id from a supported YouTube URL. */
export function parseYouTubeId(url: string): string | null {
  return inspectYouTubeUrl(url).id;
}

const SITE_URL = (() => {
  try {
    const env = (import.meta as ImportMeta).env?.VITE_SITE_URL;
    if (env) return env.replace(/\/$/, '');
    return window.location.origin;
  } catch {
    return 'https://qfza.app';
  }
})();

/**
 * YouTube's own thumbnail for a video.
 *
 * `hqdefault` rather than `maxresdefault`: the 480x360 frame exists for every
 * video ever uploaded, while maxres 404s for anything old or low-definition —
 * and at the size a history card draws it, 480px wide is already sharper than
 * the 1x/2x screens show. YouTube letterboxes hqdefault to 4:3, which the caller's
 * `object-cover` crops away.
 */
export function buildThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
}

/** Build a YouTube watch URL that starts playback at the given second. */
export function buildWatchUrl(youtubeId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}&t=${Math.floor(seconds)}`;
}

/** Build a shareable qfza.app link that loads the video at the given second. */
export function buildShareUrl(youtubeId: string, seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  return `${SITE_URL}/?v=${encodeURIComponent(youtubeId)}&t=${t}`;
}

/**
 * The same deep link as {@link buildShareUrl} but relative to the current host,
 * for the href of a link the app handles itself.
 *
 * An anchor keeps behaviours a button would throw away — middle-click,
 * ctrl-click, "open in new tab", and the status-bar preview all still work,
 * because the href is a real destination. Relative rather than absolute so a
 * local build replays locally instead of sending the developer to production.
 *
 * `foundNothing` is what makes a link to a fruitless search behave like the
 * search did. A search that matched nothing has no moment, so its href carries
 * `empty=1` rather than `t=0` — without it, opening or reloading the link would
 * invent a match at the start of the video and answer a question the visitor
 * already knows the answer to. Clicking the row in the app and opening that same
 * href have to agree, and the URL is the only thing that survives a reload.
 */
export function buildMomentHref(
  youtubeId: string,
  seconds: number,
  options: { foundNothing?: boolean } = {},
): string {
  const t = Math.max(0, Math.floor(seconds));
  const base = `/?v=${encodeURIComponent(youtubeId)}&t=${t}`;
  return options.foundNothing ? `${base}&empty=1` : base;
}

export interface DeepLink {
  youtubeId: string;
  seconds: number;
  /**
   * True when the link was built for a search that matched nothing.
   *
   * Distinct from `seconds === 0`: both open at the start of the video, but only
   * one of them has a result to show.
   */
  foundNothing: boolean;
}

/**
 * Read a `?v=<id>&t=<seconds>` deep link produced by {@link buildShareUrl}, or
 * the `&empty=1` variant {@link buildMomentHref} writes for a search that found
 * nothing. Returns null when the URL is not a valid shared-moment link, so a
 * normal visit to the site is unaffected.
 *
 * An unrecognised `empty` value is treated as "found something", so a hand-typed
 * or truncated URL degrades to the ordinary moment view instead of an empty one.
 */
export function parseShareUrl(search: string): DeepLink | null {
  try {
    const params = new URLSearchParams(search);
    const id = params.get('v');
    if (!id || !YOUTUBE_ID_REGEX.test(id)) return null;
    const raw = Number(params.get('t'));
    const seconds = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    return { youtubeId: id, seconds, foundNothing: params.get('empty') === '1' };
  } catch {
    return null;
  }
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
