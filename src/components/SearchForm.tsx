import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { parseYouTubeId } from '../utils/youtube';
import type { SearchLanguage } from '../types';

interface Props {
  onSubmit: (url: string, keyword: string, language: SearchLanguage) => void;
  disabled?: boolean;
  initialUrl?: string;
  initialKeyword?: string;
}

const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F]/;

function isArabicText(value: string): boolean {
  return ARABIC_PATTERN.test(value);
}

/**
 * JumpTo search form. Renders centered card fields with auto-RTL support
 * for the keyword input based on the selected language or typed text.
 */
export function SearchForm({
  onSubmit,
  disabled = false,
  initialUrl = '',
  initialKeyword = '',
}: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [language, setLanguage] = useState<SearchLanguage>(getLanguage() === 'ar' ? 'ar' : 'en');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  const keywordDir = isArabicText(keyword) || language === 'ar' ? 'rtl' : 'ltr';
  const inputAlign = keywordDir === 'rtl' ? 'text-right' : 'text-left';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    setKeywordError(null);
    const cleanUrl = url.trim();
    const cleanKeyword = keyword.trim();

    const hasUrlError = !cleanUrl || !parseYouTubeId(cleanUrl);
    const hasKeywordError = !cleanKeyword;

    if (hasUrlError) {
      setUrlError(cleanUrl ? t('error.invalidUrl') : t('error.urlRequired'));
    }
    if (hasKeywordError) {
      setKeywordError(t('error.keywordRequired'));
    }
    if (hasUrlError || hasKeywordError) {
      return;
    }
    onSubmit(cleanUrl, cleanKeyword, language);
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15';

  return (
    <form
      className="grid w-full max-w-xl gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      onSubmit={handleSubmit}
      aria-label={t('form.title')}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="url">
          {t('form.urlLabel')}
        </label>
        <input
          id="url"
          type="url"
          dir="ltr"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t('form.urlPlaceholder')}
          aria-describedby={urlError ? 'url-error' : undefined}
          aria-invalid={urlError ? true : undefined}
          className={`${inputClass} text-left placeholder:text-left`}
        />
        {urlError ? (
          <p className="text-sm font-semibold text-rose-600" role="alert" id="url-error">
            {urlError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="keyword">
          {t('form.keywordLabel')}
        </label>
        <input
          id="keyword"
          type="text"
          dir={keywordDir}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('form.keywordPlaceholder')}
          aria-describedby={keywordError ? 'keyword-error' : undefined}
          aria-invalid={keywordError ? true : undefined}
          className={`${inputClass} ${inputAlign} ${keywordDir === 'rtl' ? 'u-ar-font' : ''}`}
        />
        {keywordError ? (
          <p className="text-sm font-semibold text-rose-600" role="alert" id="keyword-error">
            {keywordError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="language">
          {t('form.languageLabel')}
        </label>
        <select
          id="language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as SearchLanguage)}
          className={inputClass}
        >
          <option value="en">{t('form.languageEn')}</option>
          <option value="ar">{t('form.languageAr')}</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0 active:bg-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-wait disabled:animate-pulse disabled:bg-slate-400 disabled:shadow-none"
      >
        {disabled ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
        ) : (
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            🎯
          </span>
        )}
        {disabled ? t('form.searching') : t('form.submit')}
      </button>
    </form>
  );
}
