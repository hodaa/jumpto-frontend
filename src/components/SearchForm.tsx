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
  'w-full rounded-lg border px-4 py-2.5 ps-10 text-slate-900 placeholder:text-slate-500 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2';

/**
 * Quiet "ghost" action shown inside a field's trailing rail (the clear × and
 * the paste button). Deliberately borderless, flat and low-contrast so it can
 * never be mistaken for the primary submit CTA.
 */
const RAIL_ICON_BUTTON =
  'pointer-events-auto inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors duration-200 hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 disabled:hover:bg-transparent';

/**
 * Paste action inside the URL field. Deliberately more prominent than the quiet
 * clear (×) rail button: an accent-tinted pill with an interactive hover/active
 * state so users immediately recognise it as the one-tap way to drop a link in.
 * It stays borderless and shadow-free (a test pins this) so it still reads as a
 * secondary in-field affordance, never a rival to the primary submit CTA.
 */
const PASTE_ICON_BUTTON =
  'pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-strong transition-all duration-200 hover:bg-accent/20 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-accent/10';

/** Short bullet keys shown under the CTA; the long form goes in the popover. */
const HELPER_BULLETS = ['form.helperAccepted', 'form.helperSpeed', 'form.helperPrivacy'] as const;

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
 * قفزه search form. Renders centered card fields with auto-RTL support
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
 * Ctrl/Cmd+V. Nothing is cleared automatically. The Paste affordance itself is
 * a quiet in-field icon button — flat, borderless, secondary colour — so it
 * never competes with the primary submit CTA.
 *
 * The accepted-sources / timing / privacy microcopy is condensed into three
 * scannable bullets; the full explanation sits behind a "Privacy & how it
 * works" popover (Escape or an outside click dismisses it).
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
  // Disclosure for the detailed privacy/how-it-works copy kept out of the
  // reading flow: a small popover anchored to a quiet text trigger.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!detailsOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) {
        setDetailsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailsOpen(false);
        detailsTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [detailsOpen]);

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
      /* URL field stays LTR for typed URLs, but in Arabic mode its placeholder
         is right-aligned so it reads from the right edge exactly like the
         keyword field's Arabic placeholder. */
      .search-input--ph-rtl::placeholder,
      .search-input--ph-rtl::-webkit-input-placeholder,
      .search-input--ph-rtl::-moz-placeholder,
      .search-input--ph-rtl:-ms-input-placeholder {
        text-align: right !important;
        direction: rtl;
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

  const keywordTrailing =
    keywordError && hasKeyword ? 'pe-18' : keywordError ? 'pe-8' : hasKeyword ? 'pe-10' : 'pe-4';

  return (
    <form
      className="mx-auto grid w-full max-w-2xl gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl ring-1 ring-slate-900/5 hover:shadow-2xl transition-shadow sm:p-8 lg:p-9 animate-fade-in-up"
      onSubmit={handleSubmit}
      aria-label={t('form.title')}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="url">
          {t('form.urlLabel')}
        </label>
        {/* URLs are intrinsically LTR: the field never follows the phrase's
            direction, so caret movement and editing stay predictable. */}
        <div className="relative">
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
            aria-describedby={urlError ? 'url-error' : pasteFailed ? 'url-paste-notice' : undefined}
            aria-invalid={urlError ? true : undefined}
              className={`${withTrailingPad(
              keywordTrailing,
              keywordDir === 'rtl'
                ? 'search-input--rtl text-right placeholder:text-right'
                : 'search-input--ltr text-left placeholder:text-left',
            )} ${fieldStateClass(keywordError !== null)}`}
            style={{ textAlign: textAlignStyle, direction: keywordDir }}
          />

          {/* Trailing controls: × clear → error icon → Paste, in a fixed flex
              rail at end-2 so they never overlap. Both actions share the same
              flat ghost chrome so neither reads as a submit button. */}
          <span className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {/* Per-field clear (×) — only when URL has text. */}
            {hasUrl && !disabled ? (
              <button
                type="button"
                onClick={handleClearUrl}
                aria-label={t('form.clearUrl')}
                title={t('form.clearUrl')}
                className={`${RAIL_ICON_BUTTON} rounded-full`}
              >
                <IconX size={14} />
              </button>
            ) : null}
            {urlError ? (
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center text-danger"
              >
                <IconAlert size={18} />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void handlePaste()}
              disabled={disabled}
              title={t('form.pasteTooltip')}
              aria-label={t('form.paste')}
              aria-keyshortcuts="Control+V Meta+V"
              className={PASTE_ICON_BUTTON}
            >
              <IconClipboard size={16} />
            </button>
          </span>
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
        {pasteFailed && !urlError ? <PasteFallbackNotice /> : null}
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
          {/* Trailing controls for keyword: × → error icon */}
          <span className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {hasKeyword && !disabled ? (
              <button
                type="button"
                onClick={handleClearKeyword}
                aria-label={t('form.clearKeywordField')}
                title={t('form.clearKeywordField')}
                className={`${RAIL_ICON_BUTTON} rounded-full`}
              >
                <IconX size={14} />
              </button>
            ) : null}
            {keywordError ? (
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center text-danger"
              >
                <IconAlert size={18} />
              </span>
            ) : null}
          </span>
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
          className="group relative inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-action px-6 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-action-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 disabled:shadow-none overflow-hidden active:scale-[0.98]"
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
          <span className="relative z-10 ms-0.5 tracking-wide">
            {disabled ? t('form.searching') : t('form.submit')}
          </span>
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

      {/* Helper block: three scannable bullets replace the long paragraph; the
          detailed privacy/how-it-works copy lives in a click-through popover
          so the form itself stays quiet. */}
      <div className="flex items-start justify-between gap-x-3 rounded-lg border border-slate-200/80 bg-slate-50 px-3.5 py-3">
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-strong">
          {HELPER_BULLETS.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span className="text-start">{t(key)}</span>
            </li>
          ))}
        </ul>
        <div ref={detailsRef} className="relative shrink-0">
          <button
            type="button"
            ref={detailsTriggerRef}
            onClick={() => setDetailsOpen((value) => !value)}
            aria-expanded={detailsOpen}
            aria-controls="form-helper-details"
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold text-muted-strong transition-colors duration-200 hover:text-action-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <IconInfo size={14} />
            {t('form.helperDetailsTrigger')}
          </button>
          {detailsOpen ? (
            <div
              id="form-helper-details"
              className="animate-fade-in absolute bottom-full end-0 z-20 mb-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-3 text-start text-xs leading-relaxed text-muted-strong shadow-lg"
              role="group"
              aria-label={t('form.helperDetailsTitle')}
            >
              <p className="mb-1 text-xs font-bold text-brand">{t('form.helperDetailsTitle')}</p>
              <p className="m-0 rtl:text-right">{t('form.helperDetails')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}
