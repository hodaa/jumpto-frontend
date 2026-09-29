import { describe, expect, it } from 'vitest';
import englishMessages from '../i18n/locales/en.json';
import arabicMessages from '../i18n/locales/ar.json';
import { parseYouTubeId } from '../utils/youtube';

/**
 * The URL field's placeholder is the only place the app shows the user what a
 * link should look like. It used to read `https://www.youtube.com/watch?v=…`,
 * which is ambiguous (does the ellipsis get replaced, or appended?) and which
 * the app's own validator rejects — `…` is not a video id. Both problems are
 * invisible to a screenshot review, so assert the invariant directly.
 */
const PLACEHOLDERS = [
  ['en', englishMessages.form.urlPlaceholder],
  ['ar', arabicMessages.form.urlPlaceholder],
] as const;

describe('URL field placeholder', () => {
  it.each(PLACEHOLDERS)('%s shows a complete link the app accepts', (_locale, text) => {
    const url = /https?:\/\/\S+/.exec(text)?.[0];
    expect(url, `placeholder contains no link: ${text}`).toBeDefined();
    expect(
      parseYouTubeId(url!),
      `placeholder shows a link the app would reject: ${url}`,
    ).not.toBeNull();
  });

  it.each(PLACEHOLDERS)('%s marks the value as an example, not a prefix', (_locale, text) => {
    // A trailing ellipsis reads as "append the rest here", which is how a user
    // ends up with `?v=…` and an unexplained validation error.
    expect(text.trimEnd().endsWith('…')).toBe(false);
    expect(text.trimEnd().endsWith('...')).toBe(false);
  });

  it.each(PLACEHOLDERS)('%s uses the same example-marking style as the keyword field', (_locale, text) => {
    const marker = _locale === 'en' ? 'e.g.' : 'مثال:';
    expect(text.startsWith(marker), `${text} should start with "${marker}"`).toBe(true);
  });

  it('shows the youtu.be form, which is what mobile share actually produces', () => {
    for (const [, text] of PLACEHOLDERS) {
      expect(text).toContain('https://youtu.be/');
    }
  });
});
