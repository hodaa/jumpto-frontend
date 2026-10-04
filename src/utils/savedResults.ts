import type { HistoryEntry, SearchMatch } from '../types';
import { formatYouTubeTime } from './youtube';

/**
 * What a saved history entry can still show.
 *
 * Three cases, and they must not collapse into each other:
 *
 * - `not_found` — the search ran and matched nothing. It is done; the honest
 *   replay is an empty result, not a pending one.
 * - `match_results` — the whole result set was stored, so the search can be
 *   reproduced exactly, snippets and all.
 * - `match_timestamps` only — the row predates stored results and carries just
 *   the seconds. Those can still be listed as moments; they simply have no
 *   snippet to show.
 *
 * `matches: null` is the fourth case and means "nothing stored to count" — a row
 * saved before either field existed. It is deliberately not the same as `[]`,
 * which means the search genuinely came back empty: a count of zero is a fact
 * about the video, an unknown count is a fact about the row.
 */
export function savedResultsOf(entry: HistoryEntry): {
  matches: SearchMatch[] | null;
  matched: boolean;
} {
  if (entry.status === 'not_found') {
    return { matches: [], matched: false };
  }
  const stored = entry.match_results?.filter((m) => m && Number.isFinite(m.progress_seconds));
  if (stored?.length) {
    return { matches: stored, matched: true };
  }
  const seconds = (entry.match_timestamps ?? []).filter((s) => Number.isFinite(s));
  return {
    matches: seconds.length
      ? seconds.map((s) => ({
          progress_seconds: s,
          timestamp: formatYouTubeTime(s),
          text_snippet: null,
        }))
      : null,
    matched: true,
  };
}
