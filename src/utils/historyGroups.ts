import type { HistoryEntry } from '../types';

/** One video, with every search the visitor made against it. */
export interface VideoHistoryGroup {
  videoId: string;
  /**
   * The video's title, or null when no loaded entry carries one. Entries are
   * written as the search runs, but the title only lands once the transcript has
   * been fetched, so the same video can be titled in one entry and bare in the
   * next. The first titled entry wins; it is the best name we have.
   */
  title: string | null;
  /** Newest first, in the order the backend returned them. */
  entries: HistoryEntry[];
}

/**
 * Collapse a flat, newest-first entry list into one group per video.
 *
 * Searching the same video more than once is the normal case, not an edge case
 * — that is what the page is for — so one card per search repeated the same
 * title and thumbnail down the screen and pushed the actual answer out of view.
 * One card per video, with the keywords underneath, matches how people
 * remember having used the tool: "that one video, I asked it three things".
 *
 * Order follows first appearance, so the most recently searched video is still
 * on top. Grouping runs over the entries loaded so far rather than the whole
 * history: the list is cursor-paginated, so a video whose searches straddle a
 * page boundary is a single group that fills out as later pages arrive.
 */
export function groupHistoryByVideo(entries: HistoryEntry[]): VideoHistoryGroup[] {
  const groups = new Map<string, VideoHistoryGroup>();

  for (const entry of entries) {
    const title = entry.video_title?.trim() || null;
    const existing = groups.get(entry.video_id);

    if (!existing) {
      groups.set(entry.video_id, {
        videoId: entry.video_id,
        title,
        entries: [entry],
      });
      continue;
    }

    existing.entries.push(entry);
    existing.title ??= title;
  }

  return [...groups.values()];
}
