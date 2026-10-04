import { describe, expect, it } from 'vitest';
import { groupHistoryByVideo } from '../utils/historyGroups';
import type { HistoryEntry } from '../types';

const entry = (over: Partial<HistoryEntry> & { id: string }): HistoryEntry =>
  ({
    video_id: 'v1',
    keyword: 'k',
    video_title: null,
    locale: null,
    source: null,
    status: 'done',
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  }) as HistoryEntry;

describe('groupHistoryByVideo', () => {
  it('keeps one group per video', () => {
    const groups = groupHistoryByVideo([
      entry({ id: 'a', video_id: 'v1' }),
      entry({ id: 'b', video_id: 'v2' }),
      entry({ id: 'c', video_id: 'v1' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.videoId)).toEqual(['v1', 'v2']);
    expect(groups[0].entries.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('orders groups by the most recent search, not by first ever seen', () => {
    const groups = groupHistoryByVideo([
      entry({ id: 'newest', video_id: 'v2' }),
      entry({ id: 'older', video_id: 'v1' }),
    ]);
    expect(groups.map((g) => g.videoId)).toEqual(['v2', 'v1']);
  });

  it('takes the title from any entry that has one', () => {
    // The title only lands once the transcript has been fetched, so the first
    // search of a video can be untitled while a later one is not.
    const groups = groupHistoryByVideo([
      entry({ id: 'a', video_id: 'v1', video_title: null }),
      entry({ id: 'b', video_id: 'v1', video_title: 'How to type faster' }),
    ]);
    expect(groups[0].title).toBe('How to type faster');
  });

  it('reports no title rather than an empty one when every entry lacks it', () => {
    const groups = groupHistoryByVideo([
      entry({ id: 'a', video_title: '   ' }),
      entry({ id: 'b', video_title: null }),
    ]);
    expect(groups[0].title).toBeNull();
  });

  it('returns nothing for an empty list', () => {
    expect(groupHistoryByVideo([])).toEqual([]);
  });

  it('merges a video split across two pages into one growing group', () => {
    const firstPage = groupHistoryByVideo([entry({ id: 'a', video_id: 'v1' })]);
    const afterSecondPage = groupHistoryByVideo([
      entry({ id: 'a', video_id: 'v1' }),
      entry({ id: 'b', video_id: 'v1' }),
    ]);
    expect(firstPage).toHaveLength(1);
    expect(afterSecondPage).toHaveLength(1);
    expect(afterSecondPage[0].entries).toHaveLength(2);
  });
});
