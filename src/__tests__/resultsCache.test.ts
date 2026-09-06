import { beforeEach, describe, expect, it } from 'vitest';
import type { SearchMatch } from '../types';
import { clearResultsCache, getCachedResults, setCachedResults } from '../utils/resultsCache';

const ONE: SearchMatch = { timestamp: '00:01', progress_seconds: 1, text_snippet: null };

describe('resultsCache', () => {
  beforeEach(() => {
    clearResultsCache();
  });

  it('returns undefined on a miss and stored results on a hit', () => {
    expect(getCachedResults('vid-1', 'hello')).toBeUndefined();
    setCachedResults('vid-1', 'hello', [ONE]);
    expect(getCachedResults('vid-1', 'hello')).toEqual([ONE]);
  });

  it('normalizes the keyword when building the cache key', () => {
    setCachedResults('vid-1', '  Hello World  ', [ONE]);
    expect(getCachedResults('vid-1', 'hello world')).toEqual([ONE]);
  });

  it('evicts the least-recently-used entry once the cache is full', () => {
    for (let i = 0; i < 20; i += 1) {
      setCachedResults('vid-1', `keyword-${i}`, [ONE]);
    }
    // Refresh entry 0 so it becomes the most-recent; then overflow.
    expect(getCachedResults('vid-1', 'keyword-0')).toEqual([ONE]);
    setCachedResults('vid-1', 'keyword-20', [ONE]);
    setCachedResults('vid-1', 'keyword-21', [ONE]);

    expect(getCachedResults('vid-1', 'keyword-1')).toBeUndefined();
    expect(getCachedResults('vid-1', 'keyword-0')).toEqual([ONE]);
    expect(getCachedResults('vid-1', 'keyword-21')).toEqual([ONE]);
  });

  it('overwrites an existing entry with the same key', () => {
    setCachedResults('vid-1', 'hello', [ONE]);
    setCachedResults('vid-1', 'hello', []);
    expect(getCachedResults('vid-1', 'hello')).toEqual([]);
  });
});
