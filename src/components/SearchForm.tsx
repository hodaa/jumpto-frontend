import { fetchVideoLanguage } from '../api/client';
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { parseYouTubeId } from '../utils/youtube';
import { IconGlobe, IconSearch, IconTarget, IconVideo } from './icons';

export interface SearchFormHandle {
  focusLanguage: () => void;
}

interface Props {
  onSubmit: (url: string, keyword: string) => void;
  onCancel?: () => void;
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
 * for the keyword input based on the detected language or typed text.
 */
export const SearchForm = forwardRef<SearchFormHandle, Props>(function SearchForm(
  {
    onSubmit,
    onCancel,
    disabled = false,
    initialUrl = '',
    initialKeyword = '',
  },
  ref,
) {
  const { t } = useTranslation();
  const languageSelectRef = useRef<HTMLSelectElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    focusLanguage: () => languageSelectRef.current?.focus(),
  }));

  useEffect(() => {
    const videoId = parseYouTubeId(url);
    if (!videoId) return;
    const timer = window.setTimeout(async () => {
      try {
        const { language } = await fetchVideoLanguage(videoId);
        if (language === 'ar' || language === 'en') {
          setDetectedLanguage(language);
        }
      } catch {
        // detection failed; keep default
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [url]);

  const isArabicLanguage = detectedLanguage === 'ar' || (!detectedLanguage && getLanguage() === 'ar');
  const keywordDir = isArabicText(keyword) || isArabicLanguage ? 'rtl' : 'ltr';
  const inputAlign = keywordDir === 'rtl' ? 'text-right' : 'text-left';
  const textAlignStyle = keywordDir === 'rtl' ? 'right' : 'left';
  const placeholderAlignClass = keywordDir === 'rtl' ? 'search-input--rtl' : 'search-input--ltr';
  const fieldIconSide = isArabicLanguage ? 'right-3' : 'left-3';
  const selectIconSide = isArabicLanguage ? 'right-3' : 'left-3';
  const selectArrowSide = isArabicLanguage ? 'left-3' : 'right-3';
  const styleInjected = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const style = document.createElement('style');
    style.textContent = `
      .search-input--rtl::placeholder,
      .search-input--rtl::-webkit-input-placeholder,
      .search-input--rtl::-moz-placeholder,
      .search-input--rtl:-ms-input-placeholder {
        text-align: right !important;
        direction: rtl;
      }
      .search-input--ltr::placeholder,
      .search-input--ltr::-webkit-input-placeholder,
      .search-input--ltr::-moz-placeholder,
      .search-input--ltr:-ms-input-placeholder {
        text-align: left !important;
        direction: ltr;
      }
      [dir='rtl'] input::placeholder,
      [dir='rtl'] input::-webkit-input-placeholder,
      [dir='rtl'] input::-moz-placeholder,
      [dir='rtl'] input:-ms-input-placeholder {
        text-align: right !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

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
    onSubmit(cleanUrl, cleanKeyword);
  };

  const inputClass = `w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 ps-10 pe-10 ${inputAlign} text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30`;

  const selectClass = `w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 ps-10 pe-10 ${isArabicLanguage ? 'text-right' : 'text-left'} text-base font-semibold text-slate-900 transition-all duration-200 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30`;

  return (
    <form
      className="grid w-full max-w-2xl gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow sm:p-8 animate-fade-in-up"
      onSubmit={handleSubmit}
      aria-label={t('form.title')}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="url">
          {t('form.urlLabel')}
        </label>
        <div className="relative">
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${fieldIconSide} text-slate-400 flex items-center justify-center w-8`}
          >
            <IconVideo size={18} />
          </span>
          <input
            id="url"
            type="url"
            dir={keywordDir}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t('form.urlPlaceholder')}
            aria-describedby={urlError ? 'url-error' : undefined}
            aria-invalid={urlError ? true : undefined}
            className={`${inputClass} ${placeholderAlignClass} ${keywordDir === 'rtl' ? 'text-right placeholder:text-right' : 'text-left placeholder:text-left'}`}
            style={{ textAlign: textAlignStyle, direction: keywordDir }}
          />
        </div>
        {urlError ? (
          <p
            className="text-sm font-semibold text-rose-600 rtl:text-right"
            role="alert"
            id="url-error"
          >
            {urlError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="keyword">
          {t('form.keywordLabel')}
        </label>
        <div className="relative">
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${fieldIconSide} text-slate-400 flex items-center justify-center w-8`}
          >
            <IconSearch size={18} />
          </span>
          <input
            id="keyword"
            type="text"
            dir={keywordDir}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t('form.keywordPlaceholder')}
            aria-describedby={keywordError ? 'keyword-error' : undefined}
            aria-invalid={keywordError ? true : undefined}
            className={`${inputClass} ${placeholderAlignClass} ${keywordDir === 'rtl' ? 'text-right placeholder:text-right' : 'text-left placeholder:text-left'}`}
            style={{ textAlign: textAlignStyle, direction: keywordDir }}
          />
        </div>
        {keywordError ? (
          <p className="text-sm font-semibold text-rose-600" role="alert" id="keyword-error">
            {keywordError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="language">
          {t('form.languageLabel')}
        </label>
        <div className="relative">
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${selectIconSide} text-slate-400 flex items-center justify-center w-8`}
          >
            <IconGlobe size={18} />
          </span>
          <select
            ref={languageSelectRef}
            id="language"
            value={detectedLanguage ?? (getLanguage() === 'ar' ? 'ar' : 'en')}
            disabled
            dir={isArabicLanguage ? 'rtl' : 'ltr'}
            className={`${selectClass} appearance-none opacity-60`}
          >
            <option value="en">{t('form.languageEn')}</option>
            <option value="ar">{t('form.languageAr')}</option>
          </select>
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${selectArrowSide} text-slate-400 flex items-center justify-center w-8`}
          >
            ▼
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <button
          type="submit"
          disabled={disabled}
          className="group relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0296c7] px-6 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-[#027aa8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0296c7]/30 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 disabled:shadow-none overflow-hidden active:scale-[0.98]"
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          {disabled ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white relative z-10"
            />
          ) : (
            <span
              aria-hidden="true"
              className="relative z-10 transition-transform duration-200 group-hover:scale-110"
            >
              <IconTarget size={18} />
            </span>
          )}
          <span className="relative z-10">{disabled ? t('form.searching') : t('form.submit')}</span>
        </button>
        {disabled && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            {t('actions.cancelSearch')}
          </button>
        ) : null}
      </div>
    </form>
  );
});