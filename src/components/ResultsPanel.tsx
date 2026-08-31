import { useTranslation } from 'react-i18next';
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

/** Full-width results panel shown while a search is processing or complete. */
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
      <div className="results-empty">
        <div className="w-full space-y-3 opacity-40 mb-6" aria-hidden="true">
          <div className="flex items-center gap-3 w-full">
            <div className="h-6 w-16 bg-slate-200 rounded-md shrink-0 animate-pulse" />
            <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3 w-full">
            <div className="h-6 w-16 bg-slate-200 rounded-md shrink-0 animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3 w-full opacity-60">
            <div className="h-6 w-16 bg-slate-200 rounded-md shrink-0 animate-pulse" />
            <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="results-empty__content">
          <div className="results-empty__icon" aria-hidden="true">
            🎯
          </div>
          <p className="results-empty__title">{t('results.idleTitle')}</p>
          <p className="results-empty__text">{t('results.idle')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
        <StatusCard progress={progress} />
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">{t('results.title', { keyword })}</h2>
          {matches.length > 0 ? (
            <ResultsToolbar onCopy={onCopy} onExport={onExport} copied={copied} />
          ) : null}
        </div>
        {youtubeId ? <VideoPlayer ref={playerRef} videoId={youtubeId} /> : null}
        <div className="mt-5">
          <ResultsList matches={matches} keyword={keyword} onSeek={onSeek} onClear={onClear} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
      <ErrorView message={errorText} onRetry={onRetry} />
    </div>
  );
}
