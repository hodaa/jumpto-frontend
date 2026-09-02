import { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ErrorView } from './ErrorView';
import { IconTarget } from './icons';
import { ResultsList } from './ResultsList';
import { ResultsToolbar } from './ResultsToolbar';
import { StatusCard } from './StatusCard';
import { VideoPlayer } from './VideoPlayer';
import type { VideoPlayerHandle } from '../hooks/useYouTubePlayer';
import type { SearchMatch } from '../types';

export type Phase = 'idle' | 'processing' | 'done' | 'error';

interface Props {
  phase: Phase;
  progress: number | null;
  matches: SearchMatch[];
  errorText: string;
  keyword: string;
  youtubeId: string | null;
  copied: boolean;
  copyFailed?: boolean;
  matchLimit?: number;
  playerRef: React.Ref<VideoPlayerHandle>;
  onCopy: () => void;
  onExport: () => void;
  onSeek: (seconds: number) => void;
  onClear: () => void;
  onNewSearch?: () => void;
  onRetry: () => void;
}

const CARD = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8';

/** Right-column white card that shows all phases of a search. */
export function ResultsPanel({
  phase,
  progress,
  matches,
  errorText,
  keyword,
  youtubeId,
  copied,
  copyFailed,
  matchLimit,
  playerRef,
  onCopy,
  onExport,
  onSeek,
  onClear,
  onNewSearch,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (phase === 'done') {
      headingRef.current?.focus();
    }
  }, [phase]);

  if (phase === 'idle') {
    return (
      <section className={CARD} aria-label={t('results.idleTitle')}>
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <IconTarget size={26} />
          </span>
          <p className="text-lg font-bold text-[#01124e]">{t('results.idleTitle')}</p>
          <p className="-mt-1 max-w-md text-sm text-slate-500">{t('results.idle')}</p>
        </div>
      </section>
    );
  }

  if (phase === 'processing') {
    return (
      <section className={CARD} aria-label={t('status.title')}>
        <StatusCard progress={progress} keyword={keyword} />
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className={CARD} aria-label={t('results.title', { keyword })}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-[#01124e] focus:outline-none min-w-0"
            dir="auto"
          >
            <Trans
              i18nKey="results.title"
              values={{ keyword }}
              components={{
                keyword: <span className="results-keyword" dir="auto" />,
              }}
            />
          </h2>
          {matches.length > 0 ? (
            <ResultsToolbar
              onCopy={onCopy}
              onExport={onExport}
              copied={copied}
              copyFailed={copyFailed}
              onNewSearch={onNewSearch}
            />
          ) : null}
        </div>
        {youtubeId ? <VideoPlayer ref={playerRef} videoId={youtubeId} /> : null}
        <div className="mt-5">
          <ResultsList
            matches={matches}
            keyword={keyword}
            onSeek={onSeek}
            onClear={onClear}
            youtubeId={youtubeId}
            matchLimit={matchLimit}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={CARD} role="alert">
      <ErrorView message={errorText} onRetry={onRetry} />
    </section>
  );
}
