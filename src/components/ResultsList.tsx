import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchMatch } from '../types';
import { formatYouTubeTime } from '../utils/youtube';

interface Props {
  matches: SearchMatch[];
  keyword: string;
  onSeek: (seconds: number) => void;
  onClear?: () => void;
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

export function ResultsList({ matches, keyword, onSeek, onClear }: Props) {
  const { t } = useTranslation();

  if (matches.length === 0) {
    return (
      <section
        className="flex flex-col items-center gap-3 py-8 text-center"
        aria-label={t('results.title', { keyword })}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl"
        >
          🔍
        </span>
        <p className="-mt-1 max-w-sm text-sm text-slate-500">{t('results.empty')}</p>
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

  return (
    <section aria-label={t('results.title', { keyword })}>
      <p className="mb-3 text-sm font-semibold text-slate-600">
        {t('results.matchCount', { count: matches.length })}
        <span className="font-normal text-slate-400"> · {t('results.hint')}</span>
      </p>
      <ol className="matches flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        {matches.map((match) => {
          const snippet = match.text_snippet ?? t('results.noSnippet');
          const highlighted = highlightKeyword(snippet, keyword);
          const snippetRtl = isArabicText(snippet);
          return (
            <li key={`${match.timestamp}-${match.progress_seconds}`}>
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 pr-4 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
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
                    className="rounded-md bg-slate-100 px-2 py-1 text-sm font-bold tabular-nums text-slate-600"
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
