import type { SearchMatch } from '../types';

const MAX_CACHE_ENTRIES = 20;

interface CachedEntry {
  matches: SearchMatch[];
  /** Video is transcribed but contains no speech/sound (null transcript). */
  noSpeech: boolean;
}

const cache = new Map<string, CachedEntry>();

function cacheKey(youtubeId: string, keyword: string): string {
  return `${youtubeId}:${keyword.trim().toLowerCase()}`;
}

/** Return cached results for a video/keyword, or undefined on a miss. */
export function getCachedResults(youtubeId: string, keyword: string): CachedEntry | undefined {
  const key = cacheKey(youtubeId, keyword);
  if (!cache.has(key)) return undefined;
  const results = cache.get(key) as CachedEntry;
  cache.delete(key);
  cache.set(key, results);
  return results;
}

/** Store results for a video/keyword, evicting the least-recent entry when full. */
export function setCachedResults(
  youtubeId: string,
  keyword: string,
  matches: SearchMatch[],
  noSpeech = false,
): void {
  const key = cacheKey(youtubeId, keyword);
  cache.delete(key);
  cache.set(key, { matches, noSpeech });
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** Clear the in-memory results cache (used by tests). */
export function clearResultsCache(): void {
  cache.clear();
}
