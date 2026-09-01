import { Trans, useTranslation } from 'react-i18next';
import { ErrorView } from './ErrorView';
import { ResultsList } from './ResultsList';
import { ResultsToolbar } from './ResultsToolbar';
import { StatusCard } from './StatusCard';
import { VideoPlayer } from './VideoPlayer';
import type { VideoPlayerHandle } from '../hooks/useYouTubePlayer';
import type { SearchMatch } from '../types';

export type Phase = 'idle' | 'processing' | 'done' | 'error' | 'mismatch';

interface Props {
  phase: Phase;
  progress: number | null;
  matches: SearchMatch[];
  errorText: string;
  keyword: string;
  youtubeId: string | null;
  copied: boolean;
  playerRef: React.Ref<VideoPlayerHandle>;
  onCopy: () => void;
  onExport: () => void;
  onSeek: (seconds: number) => void;
  onClear: () => void;
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
  playerRef,
  onCopy,
  onExport,
  onSeek,
  onClear,
  onRetry,
}: Props) {
  const { t } = useTranslation();

  if (phase === 'idle') {
    return (
      <section className={CARD} aria-label={t('results.idleTitle')}>
        <div className="w-full space-y-3 opacity-40" aria-hidden="true">
          <div className="flex items-center gap-3 w-full">
            <div className="h-6 w-16 rounded-md bg-slate-200 shrink-0 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-3 w-full">
            <div className="h-6 w-16 rounded-md bg-slate-200 shrink-0 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-3 w-full opacity-60">
            <div className="h-6 w-16 rounded-md bg-slate-200 shrink-0 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl"
          >
            🎯
          </span>
          <p className="text-lg font-bold text-slate-800">{t('results.idleTitle')}</p>
          <p className="-mt-1 max-w-md text-sm text-slate-500">{t('results.idle')}</p>
        </div>
      </section>
    );
  }

  if (phase === 'processing') {
    return (
      <section className={CARD} aria-label={t('status.title')}>
        <StatusCard progress={progress} />
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className={CARD} aria-label={t('results.title', { keyword })}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800" dir="auto">
            <Trans
              i18nKey="results.title"
              values={{ keyword }}
              components={{
                keyword: <span className="results-keyword" dir="auto" />,
              }}
            />
          </h2>
          {matches.length > 0 ? (
            <ResultsToolbar onCopy={onCopy} onExport={onExport} copied={copied} />
          ) : null}
        </div>
        {youtubeId ? <VideoPlayer ref={playerRef} videoId={youtubeId} /> : null}
        <div className="mt-5">
          <ResultsList matches={matches} keyword={keyword} onSeek={onSeek} onClear={onClear} />
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
