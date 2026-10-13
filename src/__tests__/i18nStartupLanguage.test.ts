/**
 * Which language the app starts in.
 *
 * The rule is an explicit choice first, the browser second. Both halves matter:
 * without the first, a visitor who switches to Arabic gets flipped back by
 * their browser on every visit; without the second, every English-browser
 * visitor has to switch manually to read the site they came for.
 *
 * One signal outranks both: a `?lang=` parameter on the URL. Static pages
 * ship no script, so their wordmark and nav links carry the page's locale
 * to the app that way — a reader who finishes the English blog must land
 * on an English homepage, not on whatever their browser happens to say.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveLanguage } from '../i18n';

describe('resolveLanguage', () => {
  describe('a saved preference wins', () => {
    it.each([
      ['en', 'ar'],
      ['ar', 'en'],
    ])('saved %s beats a browser asking for %s', (saved, browser) => {
      expect(resolveLanguage(saved, [browser])).toBe(saved);
    });

    it('wins over every browser preference', () => {
      expect(resolveLanguage('ar', ['en-US', 'en-GB'])).toBe('ar');
    });

    it('ignores a stored value that is not a language we ship', () => {
      // A hand-edited or stale value must not leave the app in a locale with no
      // messages; the browser decides instead.
      expect(resolveLanguage('de', ['en-US'])).toBe('en');
      expect(resolveLanguage('', ['ar-EG'])).toBe('ar');
    });
  });

  describe('the browser decides when nothing is saved', () => {
    it.each([
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['ar', 'ar'],
      ['ar-EG', 'ar'],
      ['ar-SA', 'ar'],
      ['AR-eg', 'ar'],
    ])('reads %s as %s', (tag, expected) => {
      expect(resolveLanguage(null, [tag])).toBe(expected);
    });

    it('takes the most preferred language we ship', () => {
      expect(resolveLanguage(null, ['fr-FR', 'de-DE', 'en-GB'])).toBe('en');
      expect(resolveLanguage(null, ['fr-FR', 'ar-SA'])).toBe('ar');
    });

    it('respects the browser order when both are offered', () => {
      expect(resolveLanguage(null, ['en-US', 'ar-EG'])).toBe('en');
      expect(resolveLanguage(null, ['ar-EG', 'en-US'])).toBe('ar');
    });

    it('falls back to the site default for a language we do not ship', () => {
      // Arabic, like index.html, so an unmatched browser is unchanged behaviour.
      expect(resolveLanguage(null, ['fr-FR'])).toBe('ar');
      expect(resolveLanguage(null, ['zh-CN', 'ja-JP'])).toBe('ar');
    });

    it('falls back to the site default when the browser says nothing', () => {
      expect(resolveLanguage(null, [])).toBe('ar');
    });
  });
});

const setBrowserLanguages = (languages: string[]) => {
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
  Object.defineProperty(navigator, 'language', {
    value: languages[0] ?? '',
    configurable: true,
  });
};

describe('language detection at startup', () => {
  /** Load a fresh copy of the module so its startup path actually runs. */
  const startupLanguage = async (): Promise<string> => {
    vi.resetModules();
    const mod = await import('../i18n');
    return mod.getLanguage();
  };

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('starts in the browser language when the visitor has no saved choice', async () => {
    setBrowserLanguages(['ar-EG']);
    expect(await startupLanguage()).toBe('ar');
  });

  it('starts in English for an English browser', async () => {
    setBrowserLanguages(['en-US']);
    expect(await startupLanguage()).toBe('en');
  });

  it('restores the saved choice over the browser language', async () => {
    // The regression this whole feature is for: a visitor who switched to
    // Arabic must not be handed English again because their browser says so.
    setBrowserLanguages(['en-US']);
    localStorage.setItem('qfza.lang', 'ar');
    expect(await startupLanguage()).toBe('ar');
  });

  it('migrates a preference saved under the pre-rebrand key', async () => {
    setBrowserLanguages(['en-US']);
    localStorage.setItem('jumpto.lang', 'ar');
    expect(await startupLanguage()).toBe('ar');
    // The old key is copied across once and retired, so the
    // migration cannot run again.
    expect(localStorage.getItem('qfza.lang')).toBe('ar');
    expect(localStorage.getItem('jumpto.lang')).toBeNull();
  });

  it('reads the whole preference list, not just navigator.language', async () => {
    // navigator.language is the browser's top UI language and is often one we do
    // not ship, while navigator.languages still lists one we do. Reading only the
    // first entry would hand this visitor the site default instead of English.
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
    setBrowserLanguages(['fr-FR', 'en-GB']);
    expect(await startupLanguage()).toBe('en');
  });

  it('applies the detected language to the document', async () => {
    setBrowserLanguages(['ar-EG']);
    await startupLanguage();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('survives browser storage that throws', async () => {
    setBrowserLanguages(['en-US']);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    // Unreadable storage is treated as no preference, not as a crash.
    expect(await startupLanguage()).toBe('en');
    getItem.mockRestore();
  });
});

describe('a ?lang= parameter from a static page', () => {
  /** Load a fresh copy of the module at a URL with a query string. */
  const startupWithUrl = async (search: string): Promise<string> => {
    vi.resetModules();
    window.history.replaceState(null, '', `/${search}`);
    const mod = await import('../i18n');
    return mod.getLanguage();
  };

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
    vi.resetModules();
  });

  it('wins over the saved choice and the browser language', async () => {
    // The regression this is for: a reader of the English blog
    // clicks the wordmark and must not land on an Arabic homepage.
    setBrowserLanguages(['ar-EG']);
    localStorage.setItem('qfza.lang', 'ar');
    expect(await startupWithUrl('?lang=en')).toBe('en');
  });

  it('persists the choice for the rest of the visit', async () => {
    setBrowserLanguages(['ar-EG']);
    await startupWithUrl('?lang=en');
    expect(localStorage.getItem('qfza.lang')).toBe('en');
  });

  it('cleans the parameter out of the address bar', async () => {
    setBrowserLanguages(['en-US']);
    await startupWithUrl('?lang=en');
    expect(window.location.search).toBe('');
  });

  it('keeps the fragment when it cleans the URL', async () => {
    // The nav links are /?lang=en#how-it-works — the anchor must survive.
    setBrowserLanguages(['en-US']);
    await startupWithUrl('?lang=en#how-it-works');
    expect(window.location.hash).toBe('#how-it-works');
    expect(window.location.search).toBe('');
  });

  it('ignores a lang value we do not ship, leaving the URL alone', async () => {
    setBrowserLanguages(['en-US']);
    expect(await startupWithUrl('?lang=de')).toBe('en');
    expect(window.location.search).toBe('?lang=de');
  });
});
