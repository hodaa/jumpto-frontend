import { describe, expect, it } from 'vitest';
import { buildWatchUrl, parseYouTubeId } from '../utils/youtube';

describe('parseYouTubeId', () => {
  it('extracts a watch URL id', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=abcdef12345')).toBe('abcdef12345');
  });

  it('extracts a youtu.be short url id', () => {
    expect(parseYouTubeId('https://youtu.be/abcdef12345')).toBe('abcdef12345');
  });

  it('rejects urls with ids of the wrong length', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=too-short')).toBeNull();
  });

  it('rejects non-youtube urls', () => {
    expect(parseYouTubeId('https://example.com/watch?v=abcdef12345')).toBeNull();
  });

  it('rejects invalid urls strings', () => {
    expect(parseYouTubeId('not a url')).toBeNull();
  });
});

describe('buildWatchUrl', () => {
  it('builds a timestamped watch link', () => {
    expect(buildWatchUrl('abcdef12345', 62)).toBe(
      'https://www.youtube.com/watch?v=abcdef12345&t=62',
    );
  });
});
