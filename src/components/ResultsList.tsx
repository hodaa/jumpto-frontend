import { memo, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchMatch } from '../types';
import { buildShareUrl, buildWatchUrl, formatYouTubeTime } from '../utils/youtube';
import { IconCheck, IconSearch, IconShare, IconYouTube } from './icons';

const DEFAULT_MATCH_LIMIT = 50;

interface Props {
  matches: SearchMatch[];
  keyword: string;
  noSpeech?: boolean;
  onSeek: (seconds: number) => void;
  onClear?: () => void;
  youtubeId?: string | null;
  matchLimit?: number;
  currentPlayingTimestamp?: number | null;
}

/** Wrap every case-insensitive occurrence of the keyword in a highlight mark. */
function highlightKeyword(text: string, keyword: string): ReactNode {
  const key = keyword.trim();
  if (!key) {
    return text;
  }
  const lowerText = text.toLowerCase();
  const lowerKey = key.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerKey, cursor);
  while (index !== -1) {
    if (index > cursor) {
      parts.push(text.slice(cursor, index));
    }
    parts.push(
      <mark
        key={index}
        className="match-card__highlight rounded bg-accent-strong px-1 text-white transition-colors duration-200 group-hover:bg-action"
      >
        {text.slice(index, index + key.length)}
      </mark>,
    );
    cursor = index + key.length;
    index = lowerText.indexOf(lowerKey, cursor);
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts.length ? parts : text;
}

interface MatchRowProps {
  match: SearchMatch;
  keyword: string;
  onSeek: (seconds: number) => void;
  youtubeId?: string | null;
  isPlaying: boolean;
}

const SHARE_COPIED_MS = 2000;

interface ShareButtonProps {
  youtubeId: string;
  seconds: number;
  timestamp: string;
}

/** Share the moment as a qfza.app link, falling back to copying it. */
function ShareButton({ youtubeId, seconds, timestamp }: ShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const url = buildShareUrl(youtubeId, seconds);
  const shareLabel = t('results.shareMoment', { timestamp });

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: shareLabel });
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), SHARE_COPIED_MS);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? t('results.copied') : shareLabel}
      title={copied ? t('results.copied') : shareLabel}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-action ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-primary'
      }`}
    >
      {copied ? <IconCheck size={16} /> : <IconShare size={16} />}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? t('results.copied') : ''}
      </span>
    </button>
  );
}

/**
 * One timestamped result. Memoized so a playback-status change re-renders only
 * the single row whose timestamp flips (rather than all 50), and so rows never
 * re-render (and never re-run `highlightKeyword`) on an unrelated progress/ETA
 * poll.
 */
const MatchRow = memo(function MatchRow({
  match,
  keyword,
  onSeek,
  youtubeId,
  isPlaying,
}: MatchRowProps) {
  const { t } = useTranslation();
  const snippet = match.text_snippet ?? t('results.noSnippet');
  const timestamp = formatYouTubeTime(match.progress_seconds);
  const highlighted = highlightKeyword(snippet, keyword);
  return (
    <li key={`${match.timestamp}-${match.progress_seconds}`}>
      <div className="group flex flex-col rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm @min-[36rem]/matches:flex-row @min-[36rem]/matches:items-stretch">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-3 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          onClick={() => onSeek(match.progress_seconds)}
          aria-label={t('results.seek', { timestamp, snippet })}
        >
          <span className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/90 ${
                isPlaying ? 'ring-2 ring-accent ring-offset-1' : ''
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72L19 12 8 5.14z" />
              </svg>
            </span>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-sm font-bold tabular-nums ${
                isPlaying ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
              dir="ltr"
            >
              {timestamp}
            </span>
          </span>
          <p
            className="match-card__snippet min-w-0 flex-1 text-start text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere] line-clamp-2"
            dir="auto"
          >
            {highlighted}
          </p>
        </button>
        {youtubeId ? (
          <div className="flex shrink-0 items-center gap-1.5 self-stretch p-2 max-sm:w-full max-sm:justify-end max-sm:border-t max-sm:border-slate-100 @min-[36rem]/matches:items-center @min-[36rem]/matches:border-s @min-[36rem]/matches:border-slate-100">
            <ShareButton
              youtubeId={youtubeId}
              seconds={match.progress_seconds}
              timestamp={timestamp}
            />
            <a
              href={buildWatchUrl(youtubeId, match.progress_seconds)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('results.watchMoment', { timestamp })}
              title={t('results.watchOnYouTube')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[#FF0000] transition-colors duration-200 hover:border-red-300 hover:bg-red-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-action"
            >
              <IconYouTube size={18} />
            </a>
          </div>
        ) : null}
      </div>
    </li>
  );
});

export const ResultsList = memo(function ResultsList({
  matches,
  keyword,
  noSpeech = false,
  onSeek,
  onClear,
  youtubeId,
  matchLimit = DEFAULT_MATCH_LIMIT,
  currentPlayingTimestamp,
}: Props) {
  const { t } = useTranslation();
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const focusFrameRef = useRef<number | null>(null);
  const [expandedFor, setExpandedFor] = useState<{
    matches: SearchMatch[];
    keyword: string;
    youtubeId: Props['youtubeId'];
    matchLimit: number;
  } | null>(null);
  const expanded =
    expandedFor?.matches === matches &&
    expandedFor.keyword === keyword &&
    expandedFor.youtubeId === youtubeId &&
    expandedFor.matchLimit === matchLimit;
  const capped = matchLimit > 0 && matches.length > matchLimit;
  const maxVisible = capped && !expanded ? matchLimit : matches.length;
  const hiddenCount = matches.length - maxVisible;

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    },
    [matches, keyword, youtubeId, matchLimit],
  );

  const toggleExpanded = () => {
    setExpandedFor(expanded ? null : { matches, keyword, youtubeId, matchLimit });
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      // Start keyboard browsing at the newly revealed rows, not at the footer.
      const target = expanded
        ? toggleRef.current
        : listRef.current?.children[matchLimit]?.querySelector('button');
      target?.focus({ preventScroll: true });
      target?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
    });
  };

  const countBadge = (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
      {t('results.matchCount', { count: matches.length })}
    </span>
  );

  if (matches.length === 0) {
    return (
      <section
        className="flex flex-col items-center gap-3 py-8 text-center rtl:text-right"
        aria-label={t('results.listLabel', { keyword })}
      >
        {noSpeech ? (
          <>
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <IconSearch size={20} />
            </span>
            <div className="max-w-sm space-y-1">
              <p className="-mt-1 text-sm text-slate-500 rtl:text-right">{t('results.noSpeech')}</p>
            </div>
          </>
        ) : (
          <>
            {countBadge}
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <IconSearch size={20} />
            </span>
            <div className="max-w-sm space-y-1">
              <p className="-mt-1 text-sm text-slate-500 rtl:text-right">{t('results.empty')}</p>
              <p className="text-xs text-muted rtl:text-right">{t('results.emptyHint')}</p>
            </div>
          </>
        )}
        {onClear ? (
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-primary transition-colors duration-200 hover:underline focus-visible:outline-2 focus-visible:outline-action"
            onClick={onClear}
          >
            {t('results.clearKeyword')}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="@container/matches" aria-label={t('results.listLabel', { keyword })}>
      <div className="mb-3 flex flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 rtl:text-right">
          {countBadge}
          {capped ? (
            <span className="text-sm font-normal text-muted">
              {t('results.showing', { shown: maxVisible, total: matches.length })}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500 rtl:text-right">{t('results.hint')}</p>
      </div>
      <ol
        id={listId}
        ref={listRef}
        className="matches flex flex-col gap-4 lg:max-h-[60vh] lg:overflow-y-auto lg:pe-2"
      >
        {matches.slice(0, maxVisible).map((match) => (
          <MatchRow
            key={`${match.timestamp}-${match.progress_seconds}`}
            match={match}
            keyword={keyword}
            onSeek={onSeek}
            youtubeId={youtubeId}
            isPlaying={currentPlayingTimestamp === match.progress_seconds}
          />
        ))}
      </ol>
      {capped ? (
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          className="mt-3 min-h-11 rounded-lg px-2 text-sm font-semibold text-primary transition-colors duration-200 hover:underline focus-visible:outline-2 focus-visible:outline-action"
          onClick={toggleExpanded}
        >
          {expanded ? t('results.showLess') : t('results.showMore', { count: hiddenCount })}
        </button>
      ) : null}
    </section>
  );
});
