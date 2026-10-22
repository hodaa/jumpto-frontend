import { describe, expect, it } from 'vitest';
import {
  formatYouTubeTime,
  inspectYouTubeUrl,
  isYouTubeId,
  parseYouTubeId,
  parseYouTubeTime,
} from '../utils/youtube';

describe('parseYouTubeTime', () => {
  it('reads a bare number as seconds', () => {
    expect(parseYouTubeTime('90')).toBe(90);
  });

  it('reads mm:ss', () => {
    expect(parseYouTubeTime('1:30')).toBe(90);
  });

  it('reads h:mm:ss', () => {
    expect(parseYouTubeTime('1:02:03')).toBe(3723);
  });

  it('treats an empty field as not filled in', () => {
    expect(parseYouTubeTime('')).toBeNull();
    expect(parseYouTubeTime('   ')).toBeNull();
  });

  it.each(['abc', '1:', ':30', '1:2:3:4', '-5', '1.5'])(
    'flags an unparseable time as NaN: %s',
    (bad) => {
      expect(Number.isNaN(parseYouTubeTime(bad))).toBe(true);
    },
  );

  it('round-trips every time the player formatter produces', () => {
    for (const seconds of [0, 5, 90, 599, 3599, 3600, 3723]) {
      expect(parseYouTubeTime(formatYouTubeTime(seconds))).toBe(seconds);
    }
  });
});

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

describe('isYouTubeId', () => {
  it('accepts the 11-character id shape', () => {
    expect(isYouTubeId('abcdef12345')).toBe(true);
    expect(isYouTubeId('dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects anything of another length', () => {
    expect(isYouTubeId('abcdef1234')).toBe(false);
    expect(isYouTubeId('abcdef123456')).toBe(false);
    expect(isYouTubeId('1DOoJhC6NHpLSu2nAvaWy3HukVimEyyhE')).toBe(false);
  });
});

describe('supported YouTube sources and formats', () => {
  it.each([
    'https://youtube.com/watch?v=abcdef12345&t=50',
    'https://m.youtube.com/watch?v=abcdef12345',
    'https://youtu.be/abcdef12345?si=shared',
  ])('accepts a supported watch/share URL: %s', (url) => {
    expect(inspectYouTubeUrl(url)).toEqual({ id: 'abcdef12345', issue: null });
  });

  it.each([
    'shorts/abcdef12345',
    'live/abcdef12345',
    'embed/abcdef12345',
    'playlist?list=abc',
    '@channel',
  ])('reports an unsupported YouTube path rather than accepting it: %s', (path) => {
    expect(inspectYouTubeUrl(`https://www.youtube.com/${path}`)).toEqual({
      id: null,
      issue: 'unsupportedFormat',
    });
    expect(parseYouTubeId(`https://www.youtube.com/${path}`)).toBeNull();
  });

  it.each([
    'https://vimeo.com/123',
    'https://youtube.com.example.org/watch?v=abcdef12345',
    'https://example.com/?v=abcdef12345',
  ])('distinguishes an unsupported source: %s', (url) => {
    expect(inspectYouTubeUrl(url).issue).toBe('unsupportedSource');
  });

  it.each([
    'ftp://youtube.com/watch?v=abcdef12345',
    'https://user:password@youtube.com/watch?v=abcdef12345',
    'not a url',
    'https://youtu.be/invalid',
  ])('rejects malformed or non-HTTP(S) video links: %s', (url) => {
    expect(inspectYouTubeUrl(url)).toEqual({ id: null, issue: 'invalid' });
  });
});
