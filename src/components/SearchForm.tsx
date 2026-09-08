import { useRef, useState, useEffect, useImperativeHandle } from 'react';
import type { ChangeEvent, FormEvent, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { inspectYouTubeUrl } from '../utils/youtube';
import type { YouTubeUrlIssue } from '../utils/youtube';
import {
  IconAlert,
  IconClipboard,
  IconInfo,
  IconSearch,
  IconTarget,
  IconVideo,
  IconX,
} from './icons';

export interface SearchFormHandle {
  /** Preserve the video URL and return to editing the phrase after a search. */
  focusKeyword(clear?: boolean): void;
  /** Submit current field values through the same custom validation as the main CTA. */
  submit(): void;
}

interface Props {
  ref?: Ref<SearchFormHandle>;
  onSubmit: (url: string, keyword: string) => void;
  disabled?: boolean;
  /** Latches the submit button off after a finished search until the fields change. */
  submitLocked?: boolean;
  onChange?: (url: string, keyword: string) => void;
  initialUrl?: string;
  initialKeyword?: string;
}

/**
 * Field error codes. They are stored untranslated and resolved with `t()` at
 * render time, so a visible error follows the active language (EN/AR) live.
 */
type UrlError = 'required' | YouTubeUrlIssue;
type PasteIssue = 'unavailable' | 'empty';
type KeywordError = 'required';

const URL_ERROR_KEY: Record<UrlError, string> = {
  required: 'error.urlRequired',
  invalid: 'error.invalidUrl',
  unsupportedSource: 'error.unsupportedSource',
  unsupportedFormat: 'error.unsupportedFormat',
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
  return inspectYouTubeUrl(clean).issue;
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
  'min-h-14 w-full rounded-lg border px-4 py-2.5 ps-10 text-base text-slate-900 placeholder:text-slate-500 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2';

/**
 * Quiet "ghost" action shown inside a field's trailing rail (the clear × and
 * the paste button). Deliberately borderless, flat and low-contrast so it can
 * never be mistaken for the primary submit CTA.
 */
const RAIL_ICON_BUTTON =
  'pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-500 transition-colors duration-200 hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:opacity-40 disabled:hover:bg-transparent';

/**
 * Paste action inside the URL field. Deliberately more prominent than the quiet
 * clear (×) rail button: an accent-tinted pill with an interactive hover/active
 * state so users immediately recognise it as the one-tap way to drop a link in.
 * It stays borderless and shadow-free (a test pins this) so it still reads as a
 * secondary in-field affordance, never a rival to the primary submit CTA.
 */
const PASTE_ICON_BUTTON =
  'pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-strong transition-all duration-200 hover:bg-accent/20 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-accent/10';

/** Short bullet keys shown under the CTA; the long form goes in the popover. */
const HELPER_BULLETS = ['form.helperAccepted', 'form.helperSpeed', 'form.helperPrivacy'] as const;

function withTrailingPad(pe: string, extra = ''): string {
  return `${inputBase} ${pe} ${extra}`;
}

/** Danger border + tint for invalid fields, neutral border for valid ones. */
function fieldStateClass(hasError: boolean): string {
  return hasError
    ? 'border-danger bg-danger-soft focus:border-danger focus:ring-danger'
    : 'border-slate-200 bg-slate-50 focus:border-action focus:ring-action';
}

/**
 * Persistent paste-failure notice. The translated message contains a
 * `<strong>Ctrl/⌘+V</strong>` segment; we split on that marker so we can
 * render the keyboard shortcut semantically without using innerHTML.
 */
function PasteFallbackNotice({ issue }: { issue: PasteIssue }) {
  const { t } = useTranslation();
  const raw = `${t(issue === 'empty' ? 'form.pasteEmpty' : 'form.pasteBlocked')} ${t('form.pasteManual')}`;
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
        {shortcut ? <strong className="font-bold"><bdi dir="ltr">{shortcut}</bdi></strong> : null}
        {after}
      </span>
    </div>
  );
}

/**
 * قفزة search form. Renders centered card fields with auto-RTL support
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
  ref,
  onSubmit,
  disabled = false,
  submitLocked = false,
  onChange,
  initialUrl = '',
  initialKeyword = '',
}: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [urlError, setUrlError] = useState<UrlError | null>(null);
  const [keywordError, setKeywordError] = useState<KeywordError | null>(null);
  // Keep recovery guidance visible until the user edits or retries the action.
  const [pasteIssue, setPasteIssue] = useState<PasteIssue | null>(null);
  const clipboardRequestRef = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFrameRef = useRef<number | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const keywordRef = useRef<HTMLInputElement>(null);
  // Disclosure for the detailed privacy/how-it-works copy kept out of the
  // reading flow: a small popover anchored to a quiet text trigger.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLayout, setDetailsLayout] = useState({ above: true, maxHeight: 384 });
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const cancelPendingFieldAction = () => {
    clipboardRequestRef.current += 1;
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focusKeyword(clear = false) {
        cancelPendingFieldAction();
        setPasteIssue(null);
        if (clear) {
          setKeyword('');
          setKeywordError(null);
        }
        setDetailsOpen(false);
        if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
        // Wait for the idle layout and any field reset before restoring focus.
        focusFrameRef.current = requestAnimationFrame(() => {
          focusFrameRef.current = null;
          keywordRef.current?.focus({ preventScroll: true });
          keywordRef.current?.select();
          formRef.current?.scrollIntoView?.({ behavior: 'instant', block: 'start' });
        });
      },
      submit() {
        formRef.current?.requestSubmit();
      },
    }),
    [],
  );

  useEffect(
    () => () => {
      cancelPendingFieldAction();
    },
    [],
  );

  // Report the live field values so the parent can latch the submit button
  // off after a finished search until the inputs actually change.
  useEffect(() => {
    onChange?.(url, keyword);
  }, [onChange, url, keyword]);

  useEffect(() => {
    if (disabled) cancelPendingFieldAction();
  }, [disabled]);

  const positionDetails = () => {
    const anchor = detailsTriggerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    if (anchor.bottom < top || anchor.top > bottom) {
      setDetailsOpen(false);
      return;
    }
    const aboveSpace = Math.max(0, anchor.top - top - 16);
    const belowSpace = Math.max(0, bottom - anchor.bottom - 16);
    const above = aboveSpace >= belowSpace;
    const maxHeight = Math.min(384, above ? aboveSpace : belowSpace);
    setDetailsLayout((current) => current.above === above && current.maxHeight === maxHeight
      ? current : { above, maxHeight });
  };

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
    window.addEventListener('resize', positionDetails);
    window.addEventListener('scroll', positionDetails, true);
    window.visualViewport?.addEventListener('resize', positionDetails);
    window.visualViewport?.addEventListener('scroll', positionDetails);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', positionDetails);
      window.removeEventListener('scroll', positionDetails, true);
      window.visualViewport?.removeEventListener('resize', positionDetails);
      window.visualViewport?.removeEventListener('scroll', positionDetails);
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

  const focusPastedUrl = (request: number, select: boolean) => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      if (request !== clipboardRequestRef.current) return;
      const el = urlRef.current;
      if (!el || el.readOnly) return;
      el.focus();
      if (select) el.select();
      else el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const showPasteFallback = (issue: PasteIssue, request: number) => {
    setPasteIssue(issue);
    focusPastedUrl(request, true);
  };

  const handlePaste = async () => {
    if (disabled) return;
    cancelPendingFieldAction();
    const request = clipboardRequestRef.current;
    if (!canPaste) {
      showPasteFallback('unavailable', request);
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      // A delayed clipboard response must not overwrite edits or an active search.
      if (request !== clipboardRequestRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) {
        showPasteFallback('empty', request);
        return;
      }
      setUrl(trimmed);
      setPasteIssue(null);
      if (urlError !== null) setUrlError(validateUrl(trimmed));
      focusPastedUrl(request, false);
    } catch {
      if (request !== clipboardRequestRef.current) return;
      showPasteFallback('unavailable', request);
    }
  };

  const isArabicLanguage = getLanguage() === 'ar';
  const urlDir = isArabicLanguage ? 'rtl' : 'ltr';
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
    if (disabled) return;
    cancelPendingFieldAction();
    const value = event.target.value;
    setUrl(value);
    // User started typing again — paste failure is resolved.
    if (pasteIssue) setPasteIssue(null);
    if (urlError !== null) setUrlError(validateUrl(value));
  };

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    cancelPendingFieldAction();
    const value = event.target.value;
    setKeyword(value);
    if (keywordError !== null) setKeywordError(validateKeyword(value));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    cancelPendingFieldAction();
    setPasteIssue(null);
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
    if (disabled) return;
    cancelPendingFieldAction();
    setUrl('');
    setUrlError(null);
    setPasteIssue(null);
    urlRef.current?.focus();
  };

  /** Clear just the keyword field — no automatic cascade. */
  const handleClearKeyword = () => {
    if (disabled) return;
    cancelPendingFieldAction();
    setKeyword('');
    setKeywordError(null);
    keywordRef.current?.focus();
  };

  /** Clear all fields — requires an explicit click; nothing auto-clears. */
  const handleClearAll = () => {
    if (disabled) return;
    cancelPendingFieldAction();
    setUrl('');
    setKeyword('');
    setUrlError(null);
    setKeywordError(null);
    setPasteIssue(null);
    urlRef.current?.focus();
  };

  const hasUrl = url.trim().length > 0;
  const hasKeyword = keyword.trim().length > 0;
  const hasInput = hasUrl || hasKeyword;

  const showUrlClear = hasUrl && !disabled;
  // Keep the 44px Paste target inside the URL field, but move URL clear to
  // the label row so even a narrow field has room for the URL and error icon.
  const urlTrailing = urlError ? 'pe-22' : 'pe-14';
  const keywordTrailing = keywordError
    ? hasKeyword && !disabled ? 'pe-22' : 'pe-10'
    : hasKeyword && !disabled ? 'pe-14' : 'pe-4';

  return (
    <form
      ref={formRef}
      className="@container/search-form scroll-mt-6 mx-auto grid w-full max-w-2xl gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl ring-1 ring-slate-900/5 hover:shadow-2xl transition-shadow sm:p-8 lg:p-9 animate-fade-in-up"
      onSubmit={handleSubmit}
      aria-label={t('form.title')}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center justify-between gap-2">
          <label className="text-sm font-semibold text-slate-700 rtl:text-right" htmlFor="url">
            {t('form.urlLabel')}
          </label>
          {showUrlClear ? (
            <button
              type="button"
              onClick={handleClearUrl}
              aria-label={t('form.clearUrl')}
              aria-controls="url"
              title={t('form.clearUrl')}
              className={`${RAIL_ICON_BUTTON} rounded-full`}
            >
              <IconX size={16} />
            </button>
          ) : null}
        </div>
        {/* URL alignment follows the UI language, not the phrase's script.
            Logical padding and controls mirror together without changing the URL value. */}
        <div className="relative" dir={urlDir}>
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 flex w-8 items-center justify-center text-slate-400">  
            <IconVideo size={18} />
          </span>
          <input
            id="url"
            ref={urlRef}
            type="url"
            readOnly={disabled}
            dir={urlDir}
            value={url}
            onChange={handleUrlChange}
            placeholder={t('form.urlPlaceholder')}
            aria-describedby={[
              urlError ? 'url-error' : '',
              pasteIssue ? 'url-paste-notice' : '',
              disabled ? 'search-lock-hint' : '',
            ].filter(Boolean).join(' ') || undefined}
            aria-invalid={urlError ? true : undefined}
            className={`${withTrailingPad(
              urlTrailing,
              urlDir === 'rtl'
                ? 'search-input--rtl text-right placeholder:text-right'
                : 'search-input--ltr text-left placeholder:text-left',
            )} ${fieldStateClass(urlError !== null)}`}
            style={{ textAlign: urlDir === 'rtl' ? 'right' : 'left', direction: urlDir }}
          />

          {/* The field's logical end rail mirrors with the selected UI language. */}
          <span className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
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
            className="flex items-start gap-1.5 text-sm font-semibold text-danger rtl:text-right [overflow-wrap:anywhere]"
            role="alert"
            id="url-error"
          >
            <IconAlert size={16} />
            {t(URL_ERROR_KEY[urlError])}
          </p>
        ) : null}
        {pasteIssue ? <PasteFallbackNotice issue={pasteIssue} /> : null}
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
            readOnly={disabled}
            dir={keywordDir}
            value={keyword}
            onChange={handleKeywordChange}
            placeholder={t('form.keywordPlaceholder')}
            aria-describedby={keywordError ? 'keyword-error' : disabled ? 'search-lock-hint' : undefined}
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
            className="flex items-start gap-1.5 text-sm font-semibold text-danger rtl:text-right [overflow-wrap:anywhere]"
            role="alert"
            id="keyword-error"
          >
            <IconAlert size={16} />
            {t(KEYWORD_ERROR_KEY[keywordError])}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {disabled ? (
          <p id="search-lock-hint" className="text-sm text-muted-strong">
            {t('form.processingHint')}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={disabled || submitLocked}
          className={`group relative inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-action px-6 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-action-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-action focus-visible:ring-offset-2 overflow-hidden active:scale-[0.98] ${
            disabled ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed'
          }`}
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          {disabled ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/50 border-t-white relative z-10"
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
            {disabled
              ? t('form.searching')
              : submitLocked
                ? t('form.searchAgainHint')
                : t('form.submit')}
          </span>
        </button>
        {hasInput && !disabled ? (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm font-semibold text-action transition-colors duration-200 hover:text-action-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action rounded"
          >
            {t('form.clear')}
          </button>
        ) : null}
      </div>

      {/* Helper block: three scannable bullets replace the long paragraph; the
          detailed privacy/how-it-works copy lives in a click-through popover
          so the form itself stays quiet. */}
      <div className="flex min-w-0 flex-col items-center gap-3.5 rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-4">
        <ul className="flex w-full min-w-0 flex-col gap-2.5 text-sm leading-relaxed text-muted-strong [overflow-wrap:anywhere]">
          {HELPER_BULLETS.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-accent"
              />
              <span className="text-start">{t(key)}</span>
            </li>
          ))}
        </ul>
        <div
          ref={detailsRef}
          className="relative flex w-full min-w-0 justify-center"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDetailsOpen(false);
            }
          }}
        >
          <button
            type="button"
            ref={detailsTriggerRef}
            onClick={() => {
              positionDetails();
              setDetailsOpen((value) => !value);
            }}
            aria-expanded={detailsOpen}
            aria-controls="form-helper-details"
            className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold text-muted-strong transition-colors duration-200 hover:text-action-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <IconInfo size={14} />
            {t('form.helperDetailsTrigger')}
          </button>
          {detailsOpen ? (
            <div
              id="form-helper-details"
              className={`animate-fade-in absolute end-0 z-20 w-full overflow-y-auto @min-[32rem]/search-form:w-80 rounded-xl border border-slate-200 bg-white p-3 text-start text-xs leading-relaxed text-muted-strong shadow-lg ${detailsLayout.above ? 'bottom-full mb-2' : 'top-full mt-2'}`}
              style={{ maxHeight: detailsLayout.maxHeight }}
              role="group"
              aria-label={t('form.helperDetailsTitle')}
            >
              <p className="mb-1 text-xs font-bold text-brand">{t('form.helperDetailsTitle')}</p>
              <p className="mb-2 rtl:text-right">{t('form.helperSources')}</p>
              <p className="m-0 rtl:text-right">{t('form.helperDetails')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}
