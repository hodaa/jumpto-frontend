import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

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
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    messages.app.metaDescription,
  );
}

/** The language currently active in i18n. */
export function getLanguage(): Language {
  return (i18n.language === 'ar' ? 'ar' : 'en') as Language;
}

/** Switch the UI language and keep document direction and branding in sync. */
export function setLanguage(lang: Language): void {
  localStorage.setItem(STORAGE_KEY, lang);
  applyDocumentLanguage(lang);
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
