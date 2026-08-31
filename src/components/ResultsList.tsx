import { useTranslation } from 'react-i18next';
import type { SearchMatch } from '../types';

interface Props {
  matches: SearchMatch[];
  keyword: string;
  onSeek: (seconds: number) => void;
  onClear?: () => void;
}

export function ResultsList({ matches, keyword, onSeek, onClear }: Props) {
  const { t } = useTranslation();

  if (matches.length === 0) {
    return (
      <section className="results-none" aria-label={t('results.title', { keyword })}>
        <div className="results-none__icon" aria-hidden="true">
          🔍
        </div>
        <p className="results-none__text">{t('results.empty')}</p>
        {onClear ? (
          <button type="button" className="text-xs text-blue-600 hover:underline" onClick={onClear}>
            {t('results.clearKeyword')}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="results" aria-label={t('results.title', { keyword })}>
      <p className="results-canvas__count">{t('results.matchCount', { count: matches.length })}</p>
      <ol className="matches">
        {matches.map((match) => (
          <li key={`${match.timestamp}-${match.progress_seconds}`} className="match">
            <button
              type="button"
              className="match-card"
              onClick={() => onSeek(match.progress_seconds)}
              aria-label={t('results.seek', {
                timestamp: match.timestamp,
                snippet: match.text_snippet ?? t('results.noSnippet'),
              })}
            >
              <span className="match-card__time">{match.timestamp}</span>
              <p className="match-card__snippet">{match.text_snippet ?? t('results.noSnippet')}</p>
              <span className="match-card__play" aria-hidden="true">
                ▶
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
