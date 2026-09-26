import { describe, expect, it } from 'vitest';
import { buildWatchUrl, buildShareUrl, inspectYouTubeUrl, parseShareUrl, parseYouTubeId } from '../utils/youtube';

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

describe('buildShareUrl', () => {
  it('builds a site link carrying the video id and moment', () => {
    const url = new URL(buildShareUrl('abcdef12345', 62));
    expect(url.searchParams.get('v')).toBe('abcdef12345');
    expect(url.searchParams.get('t')).toBe('62');
  });

  it('floors fractional seconds and clamps negatives to zero', () => {
    expect(new URL(buildShareUrl('abcdef12345', 62.9)).searchParams.get('t')).toBe('62');
    expect(new URL(buildShareUrl('abcdef12345', -5)).searchParams.get('t')).toBe('0');
  });

  it('round-trips through parseShareUrl', () => {
    expect(parseShareUrl(new URL(buildShareUrl('abcdef12345', 75)).search)).toEqual({
      youtubeId: 'abcdef12345',
      seconds: 75,
    });
  });
});

describe('parseShareUrl', () => {
  it('reads a valid shared-moment link', () => {
    expect(parseShareUrl('?v=abcdef12345&t=62')).toEqual({
      youtubeId: 'abcdef12345',
      seconds: 62,
    });
  });

  it('defaults a missing or invalid t to zero', () => {
    expect(parseShareUrl('?v=abcdef12345')).toEqual({ youtubeId: 'abcdef12345', seconds: 0 });
    expect(parseShareUrl('?v=abcdef12345&t=abc')).toEqual({
      youtubeId: 'abcdef12345',
      seconds: 0,
    });
  });

  it('returns null without a valid video id so a normal visit is unaffected', () => {
    expect(parseShareUrl('')).toBeNull();
    expect(parseShareUrl('?t=62')).toBeNull();
    expect(parseShareUrl('?v=too-short&t=62')).toBeNull();
    expect(parseShareUrl('?v=example.com&t=62')).toBeNull();
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

  it.each(['shorts/abcdef12345', 'live/abcdef12345', 'embed/abcdef12345', 'playlist?list=abc', '@channel'])(
    'reports an unsupported YouTube path rather than accepting it: %s', (path) => {
      expect(inspectYouTubeUrl(`https://www.youtube.com/${path}`)).toEqual({ id: null, issue: 'unsupportedFormat' });
      expect(parseYouTubeId(`https://www.youtube.com/${path}`)).toBeNull();
    });

  it.each(['https://vimeo.com/123', 'https://youtube.com.example.org/watch?v=abcdef12345', 'https://example.com/?v=abcdef12345'])(
    'distinguishes an unsupported source: %s', (url) => {
      expect(inspectYouTubeUrl(url).issue).toBe('unsupportedSource');
    });

  it.each(['ftp://youtube.com/watch?v=abcdef12345', 'https://user:password@youtube.com/watch?v=abcdef12345', 'not a url', 'https://youtu.be/invalid'])(
    'rejects malformed or non-HTTP(S) video links: %s', (url) => {
      expect(inspectYouTubeUrl(url)).toEqual({ id: null, issue: 'invalid' });
    });
});
