import { useTranslation } from 'react-i18next';
import type { SearchMatch } from '../types';
import { buildWatchUrl } from '../utils/youtube';

interface Props {
  matches: SearchMatch[];
  keyword: string;
  youtubeId: string;
  onSeek: (seconds: number) => void;
}

export function ResultsList({ matches, keyword, youtubeId, onSeek }: Props) {
  const { t } = useTranslation();

  if (matches.length === 0) {
    return (
      <section className="results results-empty" aria-label={t('results.title', { keyword })}>
        <div className="results-empty__icon" aria-hidden="true">
          🔍
        </div>
        <p className="results-empty__text">{t('results.empty')}</p>
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
              <span className="match-card__play">{t('results.play')}</span>
            </button>
            {youtubeId ? (
              <a
                className="match-external"
                href={buildWatchUrl(youtubeId, match.progress_seconds)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('results.watchOnYouTube')}
              >
                {t('results.watchOnYouTube')}
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
