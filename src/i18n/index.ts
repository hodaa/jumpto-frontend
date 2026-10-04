import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import { trackEvent } from '../utils/analytics';
import { isStaticPath } from '../routes';

export type Language = 'en' | 'ar';
const STORAGE_KEY = 'qfza.lang';
/** The key the preference was stored under before the rebrand. */

/**
 * Used when the visitor has saved nothing and their browser asks for neither
 * language. Arabic is the site's primary locale — the one index.html ships for
 * crawlers — so an unmatched browser keeps that rather than silently flipping
 * the whole site to the other language.
 */
const DEFAULT_LANGUAGE: Language = 'ar';

function savedLanguage(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
    // A visitor who chose a language before the key was renamed keeps
    // that choice: copy it across once, then retire the old key so the
    // migration never runs twice.

    return null;
  } catch {
    // Storage throws in locked-down privacy modes. A browser-language default
    // beats a blank page, so treat unreadable storage as no preference.
    return null;
  }
}

/** The browser's language preferences, most preferred first. */
function browserPreferences(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  // navigator.languages is the ordered list; navigator.language is just its
  // first entry and is all some browsers expose.
  const { languages, language } = navigator;
  return languages?.length ? languages : language ? [language] : [];
}

/**
 * Which language to start in: an explicit choice the visitor made wins, and
 * only when there is none does the browser decide.
 */
export function resolveLanguage(saved: string | null, preferred: readonly string[]): Language {
  if (saved === 'en' || saved === 'ar') return saved;
  for (const tag of preferred) {
    // Arabic ships as one locale behind many regional tags (ar, ar-EG, ar-SA),
    // so compare the primary subtag rather than the whole tag.
    const base = String(tag).toLowerCase().split('-')[0];
    if (base === 'en' || base === 'ar') return base;
  }
  return DEFAULT_LANGUAGE;
}

function initialLanguage(): Language {
  return resolveLanguage(savedLanguage(), browserPreferences());
}

function applyDocumentLanguage(lang: Language): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // The locale still decides text direction and `lang` on a static document —
  // but not its title or description.
  //
  // Every generated page carries its own page-specific title, description and
  // social card, written by the static renderer for that page. `contact` is also
  // a client route, so this module loads there and would otherwise stamp the
  // *homepage's* branding over it on load and again on every language switch —
  // leaving a page whose canonical says /contact/ while its title and description
  // say "home", which is the duplicate-content signal this routing work exists to
  // remove. `useDocumentMeta` deliberately leaves such routes alone for the same
  // reason, so nothing downstream would put the right values back.
  //
  // Changing language on a generated page is a navigation to its counterpart
  // document (`/contact/` <-> `/ar/contact/`), which is what the static header's
  // language link does. Nothing is lost by leaving the metadata alone here.
  if (typeof window !== 'undefined' && isStaticPath(window.location.pathname)) return;
  // Use the imported messages so branding is correct even before i18next initializes.
  const messages = lang === 'ar' ? ar : en;
  document.title = messages.app.pageTitle;
  // The social card is served to crawlers from the prerendered HTML, but a
  // share/unfurl happens after a visitor has switched language, so every one
  // of these has to track the active locale too — otherwise an Arabic page
  // unfurls an English card.
  const setMeta = (selector: string, attr: string, value: string) => {
    document.querySelector(selector)?.setAttribute(attr, value);
  };
  // Scrapers need an absolute image URL; the locale files store a root-relative
  // path so the same value works for both builds and runtime.
  const ogImage = new URL(messages.app.ogImage, window.location.origin).href;
  setMeta('meta[name="description"]', 'content', messages.app.metaDescription);
  setMeta('meta[property="og:title"]', 'content', messages.app.ogTitle);
  setMeta('meta[property="og:description"]', 'content', messages.app.ogDescription);
  setMeta('meta[property="og:image"]', 'content', ogImage);
  setMeta('meta[property="og:image:alt"]', 'content', messages.app.ogImageAlt);
  setMeta('meta[property="og:locale"]', 'content', messages.app.ogLocale);
  setMeta('meta[property="og:locale:alternate"]', 'content', messages.app.ogLocaleAlternate);
  setMeta('meta[name="twitter:title"]', 'content', messages.app.ogTitle);
  setMeta('meta[name="twitter:description"]', 'content', messages.app.ogDescription);
  setMeta('meta[name="twitter:image"]', 'content', ogImage);
  setMeta('meta[name="twitter:image:alt"]', 'content', messages.app.ogImageAlt);
}

/** The language currently active in i18n. */
export function getLanguage(): Language {
  return (i18n.language === 'ar' ? 'ar' : 'en') as Language;
}

/** Switch the UI language and keep document direction and branding in sync. */
export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // A preference that cannot be persisted still applies to this page load; it
    // just reverts to the browser's language on the next visit.
  }
  applyDocumentLanguage(lang);
  trackEvent('language_switch', { language: lang });
  void i18n.changeLanguage(lang);
}

applyDocumentLanguage(initialLanguage());

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
