import { useRef, useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { parseYouTubeId } from '../utils/youtube';
import {
  IconAlert,
  IconClipboard,
  IconInfo,
  IconSearch,
  IconTarget,
  IconVideo,
  IconX,
} from './icons';

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
 * Input chrome. Padding reserves space for:
 *  - leading  icon: ps-10
 *  - trailing Paste/clear buttons + error icon: pe-[value] set per field
 */
const inputBase =
  'w-full rounded-lg border px-4 py-2.5 ps-10 text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2';

function withTrailingPad(pe: string, extra = ''): string {
  return `${inputBase} ${pe} ${extra}`;
}

/** Danger border + tint for invalid fields, neutral border for valid ones. */
function fieldStateClass(hasError: boolean): string {
  return hasError
    ? 'border-danger bg-danger-soft focus:border-danger focus:ring-danger/30'
    : 'border-slate-200 bg-slate-50 focus:border-action focus:ring-action/30';
}

/**
 * Persistent paste-failure notice. The translated message contains a
 * `<strong>Ctrl/⌘+V</strong>` segment; we split on that marker so we can
 * render the keyboard shortcut semantically without using innerHTML.
 */
function PasteFallbackNotice() {
  const { t } = useTranslation();
  const raw = t('form.pasteBlocked');
  const marker = /<strong>([^<]+)<\/strong>/;
  const match = raw.match(marker);
  let before = raw;
  let shortcut = '';
  let after = '';
  if (match && match.index !== undefined) {
    before = raw.slice(0, match.index);
    shortcut = match[1];
    after = raw.slice(match.index + match[0].length);
  }
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm font-medium text-warning rtl:text-right animate-fade-in"
      role="alert"
      id="url-paste-notice"
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        <IconAlert size={14} />
      </span>
      <span>
        {before}
        {shortcut ? <strong className="font-bold">{shortcut}</strong> : null}
        {after}
      </span>
    </div>
  );
}

/**
 * JumpTo search form. Renders centered card fields with auto-RTL support
 * for the keyword input based on the detected language or typed text.
 *
 * Validation is fully custom (localized, YouTube-aware) and is the only
 * validation that runs: the form is `noValidate`, so the browser never shows
 * its own English-only tooltips. Errors appear on submit, the first invalid
 * field is focused, and each error re-validates as the user edits.
 *
 * Clipboard Paste has a persistent failure state with manual fallback: if the
 * Clipboard API is unavailable or denied, we leave a clear actionable notice
 * up, select the URL input contents, and let the user paste manually with
 * Ctrl/Cmd+V. Nothing is cleared automatically.
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
  // Persistent paste-failure flag: once set, stays until the user types,
  // clicks a different action, or successfully pastes — no auto-dismiss.
  const [pasteFailed, setPasteFailed] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const keywordRef = useRef<HTMLInputElement>(null);

  // Clipboard API is available only in secure contexts (HTTPS / localhost) and
  // when granted permission; otherwise we fall back to selecting the URL field
  // so the user can paste manually with Ctrl/Cmd+V.
  const canPaste =
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.readText === 'function';

  const showPasteFallback = () => {
    setPasteFailed(true);
    // Select the existing contents (if any) so a single Ctrl/Cmd+V replaces it.
    requestAnimationFrame(() => {
      const el = urlRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
  };

  const handlePaste = async () => {
    if (!canPaste) {
      showPasteFallback();
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        showPasteFallback();
        return;
      }
      setUrl(trimmed);
      setPasteFailed(false);
      if (urlError !== null) setUrlError(validateUrl(trimmed));
      // Focus and place caret at the end so the user can edit what was pasted.
      requestAnimationFrame(() => {
        const el = urlRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    } catch {
      // Permission denied or not a secure context — activate the persistent
      // select/copy fallback state.
      showPasteFallback();
    }
  };

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
    // User started typing again — paste failure is resolved.
    if (pasteFailed) setPasteFailed(false);
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

  /** Clear just the URL field — no automatic cascade. */
  const handleClearUrl = () => {
    setUrl('');
    setUrlError(null);
    setPasteFailed(false);
    urlRef.current?.focus();
  };

  /** Clear just the keyword field — no automatic cascade. */
  const handleClearKeyword = () => {
    setKeyword('');
    setKeywordError(null);
    keywordRef.current?.focus();
  };

  /** Clear all fields — requires an explicit click; nothing auto-clears. */
  const handleClearAll = () => {
    setUrl('');
    setKeyword('');
    setUrlError(null);
    setKeywordError(null);
    setPasteFailed(false);
    urlRef.current?.focus();
  };

  const hasUrl = url.trim().length > 0;
  const hasKeyword = keyword.trim().length > 0;
  const hasInput = hasUrl || hasKeyword;

  const urlTrailing = urlError ? 'pe-44' : hasUrl ? 'pe-34' : 'pe-24';
  const keywordTrailing = keywordError ? 'pe-20' : hasKeyword ? 'pe-10' : 'pe-4';

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
        <div className="relative" dir={keywordDir}>
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 flex w-8 items-center justify-center text-slate-400">
            <IconVideo size={18} />
          </span>
          <input
            id="url"
            ref={urlRef}
            type="url"
            dir={keywordDir}
            value={url}
            onChange={handleUrlChange}
            placeholder={t('form.urlPlaceholder')}
            aria-describedby={
              urlError ? 'url-error' : pasteFailed ? 'url-paste-notice' : undefined
            }
            aria-invalid={urlError ? true : undefined}
            className={`${withTrailingPad(
              urlTrailing,
              'search-input--ltr text-left placeholder:text-left',
            )} ${fieldStateClass(urlError !== null)}`}
            style={{ textAlign: 'left', direction: 'ltr' }}
          />

          {/* Inline Paste button — clipped to the input's trailing end. */}
          <button
            type="button"
            onClick={() => void handlePaste()}
            disabled={disabled}
            title={t('form.pasteTooltip')}
            aria-label={t('form.pasteTooltip')}
            className={`absolute top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-action/40 hover:text-action hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 ${
              hasUrl || urlError ? 'end-11' : 'end-2'
            }`}
          >
            <IconClipboard size={14} />
            <span>{t('form.paste')}</span>
          </button>

          {/* Per-field clear (×) — only visible when the URL has text. */}
          {hasUrl && !disabled ? (
            <button
              type="button"
              onClick={handleClearUrl}
              aria-label={t('form.clearUrl')}
              title={t('form.clearUrl')}
              className={`absolute top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                urlError ? 'end-9' : 'end-2'
              }`}
            >
              <IconX size={14} />
            </button>
          ) : null}

          {urlError ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 flex w-6 items-center justify-center text-danger"
            >
              <IconAlert size={18} />
            </span>
          ) : null}
        </div>
        {urlError ? (
          <p
            className="flex items-center gap-1.5 text-sm font-semibold text-danger rtl:text-right"
            role="alert"
            id="url-error"
          >
            <IconAlert size={16} />
            {t(URL_ERROR_KEY[urlError])}
          </p>
        ) : null}
        {pasteFailed && !urlError ? (
          <PasteFallbackNotice />
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
            className={`${withTrailingPad(
              keywordTrailing,
              keywordDir === 'rtl'
                ? 'search-input--rtl text-right placeholder:text-right'
                : 'search-input--ltr text-left placeholder:text-left',
            )} ${fieldStateClass(keywordError !== null)}`}
            style={{ textAlign: textAlignStyle, direction: keywordDir }}
          />
          {/* Per-field clear (×) on keyword. */}
          {hasKeyword && !disabled ? (
            <button
              type="button"
              onClick={handleClearKeyword}
              aria-label={t('form.clearKeywordField')}
              title={t('form.clearKeywordField')}
              className={`absolute top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                keywordError ? 'end-9' : 'end-2'
              }`}
            >
              <IconX size={14} />
            </button>
          ) : null}
          {keywordError ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 flex w-6 items-center justify-center text-danger"
            >
              <IconAlert size={18} />
            </span>
          ) : null}
        </div>
        {keywordError ? (
          <p
            className="flex items-center gap-1.5 text-sm font-semibold text-danger rtl:text-right"
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
          className="group relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-action px-6 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-action-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 disabled:shadow-none overflow-hidden active:scale-[0.98]"
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
            onClick={handleClearAll}
            className="text-sm font-semibold text-action transition-colors duration-200 hover:text-action-hover hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-focus rounded"
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

      {/* Helper disclosure: accepted sources + expected wait + privacy */}
      <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-muted rtl:text-right">
        <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">
          <IconInfo size={14} />
        </span>
        <span>{t('form.helperLine')}</span>
      </p>
    </form>
  );
}
