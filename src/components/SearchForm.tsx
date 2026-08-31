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

  return (
    <form
      className="grid w-full max-w-xl gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8"
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
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-[#00bff8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00bff8]/20"
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
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-[#00bff8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00bff8]/20"
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
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-[#00bff8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00bff8]/20"
        >
          <option value="en">{t('form.languageEn')}</option>
          <option value="ar">{t('form.languageAr')}</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#081e54] px-6 py-3.5 text-base font-bold text-white shadow-md transition hover:-translate-y-px hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#00bff8]/40 disabled:cursor-wait disabled:bg-gradient-to-r disabled:from-[#081e54] disabled:to-[#0e7490] disabled:opacity-95 disabled:shadow-[0_0_0_0_rgba(0,191,248,0.5)] disabled:animate-pulse"
      >
        {disabled ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
        ) : null}
        {disabled ? t('form.searching') : t('form.submit')}
      </button>
    </form>
  );
}
