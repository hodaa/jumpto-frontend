import { useRef, useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { parseYouTubeId } from '../utils/youtube';
import { IconAlert, IconSearch, IconTarget, IconVideo } from './icons';

interface Props {
  onSubmit: (url: string, keyword: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  initialUrl?: string;
  initialKeyword?: string;
}

/**
 * Field error codes. They are stored untranslated and resolved with `t()` at
 * render time, so a visible error follows the active language (EN/AR) live.
 */
type UrlError = 'required' | 'invalid';
type KeywordError = 'required';

const URL_ERROR_KEY: Record<UrlError, string> = {
  required: 'error.urlRequired',
  invalid: 'error.invalidUrl',
};

const KEYWORD_ERROR_KEY: Record<KeywordError, string> = {
  required: 'error.keywordRequired',
};

const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F]/;

function isArabicText(value: string): boolean {
  return ARABIC_PATTERN.test(value);
}

/** The single source of truth for URL validity — custom, language-independent. */
function validateUrl(value: string): UrlError | null {
  const clean = value.trim();
  if (!clean) return 'required';
  return parseYouTubeId(clean) ? null : 'invalid';
}

/** The single source of truth for keyword validity. */
function validateKeyword(value: string): KeywordError | null {
  return value.trim() ? null : 'required';
}

/**
 * Shared input chrome. Border colour, background and focus ring colour are
 * supplied by `fieldStateClass` so a valid field can never carry two
 * competing `border-*` utilities.
 */
const inputClass =
  'w-full rounded-lg border px-4 py-2.5 ps-10 pe-10 text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2';

/** Red border + tint for invalid fields, neutral border for valid ones. */
function fieldStateClass(hasError: boolean): string {
  return hasError
    ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/30'
    : 'border-slate-200 bg-slate-50 focus:border-primary focus:ring-primary/30';
}

/**
 * JumpTo search form. Renders centered card fields with auto-RTL support
 * for the keyword input based on the detected language or typed text.
 *
 * Validation is fully custom (localized, YouTube-aware) and is the only
 * validation that runs: the form is `noValidate`, so the browser never shows
 * its own English-only tooltips. Errors appear on submit, the first invalid
 * field is focused, and each error re-validates as the user edits.
 */
export function SearchForm({
  onSubmit,
  onCancel,
  disabled = false,
  initialUrl = '',
  initialKeyword = '',
}: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [urlError, setUrlError] = useState<UrlError | null>(null);
  const [keywordError, setKeywordError] = useState<KeywordError | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const keywordRef = useRef<HTMLInputElement>(null);

  const isArabicLanguage = getLanguage() === 'ar';
  const keywordDir = isArabicText(keyword) || isArabicLanguage ? 'rtl' : 'ltr';
  const textAlignStyle = keywordDir === 'rtl' ? 'right' : 'left';
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
    `;
    document.head.appendChild(style);
  }, []);

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setUrl(value);
    // Only re-validate once an error has been shown, so typing stays quiet
    // until the first submit; afterwards the error clears (or updates) live.
    if (urlError !== null) setUrlError(validateUrl(value));
  };

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setKeyword(value);
    if (keywordError !== null) setKeywordError(validateKeyword(value));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanUrl = url.trim();
    const cleanKeyword = keyword.trim();

    const nextUrlError = validateUrl(url);
    const nextKeywordError = validateKeyword(keyword);
    setUrlError(nextUrlError);
    setKeywordError(nextKeywordError);

    if (nextUrlError || nextKeywordError) {
      // Put the caret on the first field that still needs attention (DOM order).
      (nextUrlError ? urlRef : keywordRef).current?.focus();
      return;
    }
    onSubmit(cleanUrl, cleanKeyword);
  };

  const handleClear = () => {
    setUrl('');
    setKeyword('');
    setUrlError(null);
    setKeywordError(null);
  };

  const hasInput = url.trim().length > 0 || keyword.trim().length > 0;

  return (
    <form
      className="grid w-full max-w-2xl gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow sm:p-8 animate-fade-in-up"
      onSubmit={handleSubmit}
      aria-label={t('form.title')}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="url">
          {t('form.urlLabel')}
        </label>
        <div className="relative" dir="ltr">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 flex w-8 items-center justify-center text-slate-400">
            <IconVideo size={18} />
          </span>
          <input
            id="url"
            ref={urlRef}
            type="url"
            dir="ltr"
            value={url}
            onChange={handleUrlChange}
            placeholder={t('form.urlPlaceholder')}
            aria-describedby={urlError ? 'url-error' : undefined}
            aria-invalid={urlError ? true : undefined}
            className={`${inputClass} ${fieldStateClass(urlError !== null)} search-input--ltr text-left placeholder:text-left`}
            style={{ textAlign: 'left', direction: 'ltr' }}
          />
          {urlError ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 flex w-6 items-center justify-center text-rose-600"
            >
              <IconAlert size={18} />
            </span>
          ) : null}
        </div>
        {urlError ? (
          <p
            className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 rtl:text-right"
            role="alert"
            id="url-error"
          >
            <IconAlert size={16} />
            {t(URL_ERROR_KEY[urlError])}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="keyword">
          {t('form.keywordLabel')}
        </label>
        <div className="relative" dir={keywordDir}>
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 flex w-8 items-center justify-center text-slate-400">
            <IconSearch size={18} />
          </span>
          <input
            id="keyword"
            ref={keywordRef}
            type="text"
            dir={keywordDir}
            value={keyword}
            onChange={handleKeywordChange}
            placeholder={t('form.keywordPlaceholder')}
            aria-describedby={keywordError ? 'keyword-error' : undefined}
            aria-invalid={keywordError ? true : undefined}
            className={`${inputClass} ${fieldStateClass(keywordError !== null)} ${keywordDir === 'rtl' ? 'search-input--rtl text-right placeholder:text-right' : 'search-input--ltr text-left placeholder:text-left'}`}
            style={{ textAlign: textAlignStyle, direction: keywordDir }}
          />
          {keywordError ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 flex w-6 items-center justify-center text-rose-600"
            >
              <IconAlert size={18} />
            </span>
          ) : null}
        </div>
        {keywordError ? (
          <p
            className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 rtl:text-right"
            role="alert"
            id="keyword-error"
          >
            <IconAlert size={16} />
            {t(KEYWORD_ERROR_KEY[keywordError])}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <button
          type="submit"
          disabled={disabled}
          className="group relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 disabled:shadow-none overflow-hidden active:scale-[0.98]"
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
        {hasInput && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded"
          >
            {t('form.clear')}
          </button>
        ) : null}
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
}
