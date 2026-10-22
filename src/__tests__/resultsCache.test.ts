import { beforeEach, describe, expect, it } from 'vitest';
import type { SearchMatch } from '../types';
import { clearResultsCache, getCachedResults, setCachedResults } from '../utils/resultsCache';
import type { VideoRef } from '../utils/videoSources';

const ONE: SearchMatch = { timestamp: '00:01', progress_seconds: 1, text_snippet: null };
const VIDEO: VideoRef = { source: 'youtube', id: 'vid-1' };
const DRIVE_ID = '1DOoJhC6NHpLSu2nAvaWy3HukVimEyyhE';

describe('resultsCache', () => {
  beforeEach(() => {
    clearResultsCache();
  });

  it('returns undefined on a miss and stored results on a hit', () => {
    expect(getCachedResults(VIDEO, 'hello')).toBeUndefined();
    setCachedResults(VIDEO, 'hello', [ONE]);
    expect(getCachedResults(VIDEO, 'hello')).toEqual({ matches: [ONE], noSpeech: false });
  });

  it('keeps the same id under different sources apart', () => {
    // Ids are only unique within their source, so the source is part of the key.
    setCachedResults(VIDEO, 'hello', [ONE]);
    expect(getCachedResults({ source: 'drive', id: 'vid-1' }, 'hello')).toBeUndefined();
  });

  it('keys Drive videos by their Drive id like any other video', () => {
    const drive: VideoRef = { source: 'drive', id: DRIVE_ID };
    setCachedResults(drive, 'hello', [ONE]);
    expect(getCachedResults(drive, 'hello')).toEqual({ matches: [ONE], noSpeech: false });
    expect(getCachedResults({ source: 'youtube', id: DRIVE_ID }, 'hello')).toBeUndefined();
  });

  it('normalizes the keyword when building the cache key', () => {
    setCachedResults(VIDEO, '  Hello World  ', [ONE]);
    expect(getCachedResults(VIDEO, 'hello world')).toEqual({ matches: [ONE], noSpeech: false });
  });

  it('stores the no-speech flag alongside the matches', () => {
    setCachedResults(VIDEO, 'quiet', [], true);
    expect(getCachedResults(VIDEO, 'quiet')).toEqual({ matches: [], noSpeech: true });
  });

  it('evicts the least-recently-used entry once the cache is full', () => {
    for (let i = 0; i < 20; i += 1) {
      setCachedResults(VIDEO, `keyword-${i}`, [ONE]);
    }
    // Refresh entry 0 so it becomes the most-recent; then overflow.
    expect(getCachedResults(VIDEO, 'keyword-0')).toEqual({ matches: [ONE], noSpeech: false });
    setCachedResults(VIDEO, 'keyword-20', [ONE]);
    setCachedResults(VIDEO, 'keyword-21', [ONE]);

    expect(getCachedResults(VIDEO, 'keyword-1')).toBeUndefined();
    expect(getCachedResults(VIDEO, 'keyword-0')).toEqual({ matches: [ONE], noSpeech: false });
    expect(getCachedResults(VIDEO, 'keyword-21')).toEqual({ matches: [ONE], noSpeech: false });
  });

  it('overwrites an existing entry with the same key', () => {
    setCachedResults(VIDEO, 'hello', [ONE]);
    setCachedResults(VIDEO, 'hello', []);
    expect(getCachedResults(VIDEO, 'hello')).toEqual({ matches: [], noSpeech: false });
  });
});
