import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchMatch } from '../types';
import { buildWatchUrl, formatYouTubeTime } from '../utils/youtube';
import { IconExternalLink, IconSearch } from './icons';

const DEFAULT_MATCH_LIMIT = 50;

interface Props {
  matches: SearchMatch[];
  keyword: string;
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
        className="match-card__highlight rounded bg-primary px-1 text-white transition-colors duration-200 group-hover:bg-accent-strong"
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

export function ResultsList({
  matches,
  keyword,
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
  const expanded = expandedFor?.matches === matches && expandedFor.keyword === keyword &&
    expandedFor.youtubeId === youtubeId && expandedFor.matchLimit === matchLimit;
  const capped = matchLimit > 0 && matches.length > matchLimit;
  const maxVisible = capped && !expanded ? matchLimit : matches.length;
  const hiddenCount = matches.length - maxVisible;

  useEffect(() => () => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
  }, [matches, keyword, youtubeId, matchLimit]);

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
        className="matches flex flex-col gap-3 lg:max-h-[60vh] lg:overflow-y-auto lg:pe-1"
      >
        {matches.slice(0, maxVisible).map((match) => {
          const snippet = match.text_snippet ?? t('results.noSnippet');
          const timestamp = formatYouTubeTime(match.progress_seconds);
          const highlighted = highlightKeyword(snippet, keyword);
          return (
            <li key={`${match.timestamp}-${match.progress_seconds}`}>
              <div className="flex flex-col gap-2 @min-[36rem]/matches:flex-row @min-[36rem]/matches:items-stretch">
                <button
                  type="button"
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-start transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 cursor-pointer"
                  onClick={() => onSeek(match.progress_seconds)}
                  aria-label={t('results.seek', { timestamp, snippet })}
                >
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm text-white shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/90"
                    >
                      ▶
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-sm font-bold tabular-nums ${
                        currentPlayingTimestamp === match.progress_seconds
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                      dir="ltr"
                    >
                      {timestamp}
                    </span>
                  </span>
                  <p
                    className="match-card__snippet min-w-0 flex-1 text-start text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]"
                    dir="auto"
                  >
                    {highlighted}
                  </p>
                </button>
                {youtubeId ? (
                  <a
                    href={buildWatchUrl(youtubeId, match.progress_seconds)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('results.watchMoment', { timestamp })}
                    className="inline-flex min-h-11 max-w-full items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-action @min-[36rem]/matches:self-stretch"
                  >
                    {t('results.watchOnYouTube')}
                    <IconExternalLink />
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
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
}
