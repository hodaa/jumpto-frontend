import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import { trackEvent } from '../utils/analytics';

export type Language = 'en' | 'ar';
const STORAGE_KEY = 'jumpto.lang';

function initialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

  function applyDocumentLanguage(lang: Language): void {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
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
  localStorage.setItem(STORAGE_KEY, lang);
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
