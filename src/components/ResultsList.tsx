import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchMatch } from '../types';
import { formatYouTubeTime } from '../utils/youtube';
import { IconSearch } from './icons';

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

const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F]/;

function isArabicText(value: string): boolean {
  return ARABIC_PATTERN.test(value);
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
      <mark key={index} className="match-card__highlight rounded bg-primary px-1 text-white">
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
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const expanded = expandedKeyword === keyword;

  if (matches.length === 0) {
    return (
      <section
        className="flex flex-col items-center gap-3 py-8 text-center rtl:text-right"
        aria-label={t('results.title', { keyword })}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
        >
          <IconSearch size={20} />
        </span>
        <div className="max-w-sm space-y-1">
          <p className="-mt-1 text-sm text-slate-500 rtl:text-right">{t('results.empty')}</p>
          <p className="text-xs text-slate-400 rtl:text-right">{t('results.emptyHint')}</p>
        </div>
        {onClear ? (
          <button
            type="button"
            className="text-sm font-semibold text-primary transition-colors duration-200 hover:underline"
            onClick={onClear}
          >
            {t('results.clearKeyword')}
          </button>
        ) : null}
      </section>
    );
  }

  const capped = matchLimit > 0 && matches.length > matchLimit;
  const maxVisible = capped && !expanded ? matchLimit : matches.length;
  const hiddenCount = matches.length - maxVisible;

  return (
    <section aria-label={t('results.title', { keyword })}>
      <div className="mb-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 rtl:text-right">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {t('results.matchCount', { count: matches.length })}
          </span>
          {capped && !expanded ? (
            <span className="text-sm font-normal text-slate-400">
              {t('results.showing', { shown: maxVisible, total: matches.length })}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500 rtl:text-right">{t('results.hint')}</p>
      </div>
      <ol className="matches flex max-h-[60vh] flex-col gap-3 overflow-y-auto pe-1">
        {matches.slice(0, maxVisible).map((match) => {
          const snippet = match.text_snippet ?? t('results.noSnippet');
          const highlighted = highlightKeyword(snippet, keyword);
          const snippetRtl = isArabicText(snippet);
          return (
            <li key={`${match.timestamp}-${match.progress_seconds}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  className="group flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-start transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 cursor-pointer"
                  onClick={() => onSeek(match.progress_seconds)}
                  aria-label={t('results.seek', {
                    timestamp: formatYouTubeTime(match.progress_seconds),
                    snippet,
                  })}
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
                      {formatYouTubeTime(match.progress_seconds)}
                    </span>
                  </span>
                  <p
                    className="match-card__snippet flex-1 text-sm leading-relaxed text-slate-600"
                    dir={snippetRtl ? 'rtl' : 'ltr'}
                  >
                    {highlighted}
                  </p>
                </button>
                {youtubeId ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeId}&t=${match.progress_seconds}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm sm:self-stretch"
                  >
                    Watch on YouTube
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {capped ? (
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-primary transition-colors duration-200 hover:underline"
          onClick={() => setExpandedKeyword(expanded ? null : keyword)}
        >
          {expanded
            ? t('results.showLess', { count: matches.length })
            : t('results.showMore', { count: hiddenCount })}
        </button>
      ) : null}
    </section>
  );
}
