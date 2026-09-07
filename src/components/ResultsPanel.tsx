import { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ErrorView } from './ErrorView';
import { IconPlay, IconTarget } from './icons';
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
  estimatedSeconds?: number | null;
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
  currentPlayingTimestamp?: number | null;
}

// Idle panel: softer border, subtle background tint, no shadow — intentionally
// de-emphasized so the form carries visual weight before a search starts.
const CARD_IDLE =
  'rounded-2xl border border-slate-100 bg-slate-50/60 p-6 shadow-none sm:p-8 h-full transition-all duration-300';
// Active panel (processing/done/error): crisp white surface, full border and
// elevated shadow to draw the eye to results/status.
const CARD_ACTIVE =
  'rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 h-full transition-all duration-300';

/**
 * Faux "match rows" for the idle mockup. Each row = a timestamp chip plus two
 * bars: the first stands in for the highlighted keyword, the second for the
 * surrounding snippet text. Relative widths only — never real data.
 */
const MOCK_ROWS = [
  { time: '04:12', widths: ['78%', '46%'] },
  { time: '11:38', widths: ['64%', '82%'] },
  { time: '19:05', widths: ['70%', '38%'] },
];

/**
 * Static mock preview of a result list (player frame + timestamped rows), shown
 * only in the idle phase: the panel explains and previews its own purpose
 * instead of rendering a bare empty box. It stays low-contrast and unscaled so
 * the form keeps the loudest voice before a search runs.
 *
 * Purely decorative, so it is `aria-hidden` — the real copy below carries the
 * message, and a visible "illustrative preview" caption stops anyone from
 * reading the fake rows as results.
 */
function IdleMockup() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[17rem] select-none">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200/70">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-slate-400 shadow-sm">
          <IconPlay size={22} />
        </span>
        <span className="absolute end-2 bottom-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-500 tabular-nums">
          04:12
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-2">
        {MOCK_ROWS.map((row) => (
          <li
            key={row.time}
            className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white/70 px-2.5 py-2"
          >
            <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-strong tabular-nums">
              {row.time}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {row.widths.map((width, index) => (
                <span
                  key={width}
                  className={`h-2 rounded-full ${
                    index === 0 ? 'bg-primary/70' : 'bg-slate-300/70'
                  }`}
                  style={{ width }}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Right-column white card that shows all phases of a search. */
export function ResultsPanel({
  phase,
  progress,
  estimatedSeconds,
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
  currentPlayingTimestamp,
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
      <section
        className={`${CARD_IDLE} flex min-h-[300px] flex-col items-center justify-center gap-5`}
        aria-label={t('results.idleTitle')}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent/15 to-primary/10 text-accent"
          >
            <IconTarget size={26} />
          </span>
          <p className="text-lg font-bold text-muted-strong">{t('results.idleTitle')}</p>
          <p className="-mt-1 max-w-md text-sm text-muted">{t('results.idle')}</p>
        </div>
        <div className="flex w-full flex-col items-center gap-2">
          <IdleMockup />
          <p className="m-0 text-[11px] font-semibold text-muted-strong">
            {t('results.idleMockLabel')}
          </p>
        </div>
      </section>
    );
  }

  if (phase === 'processing') {
    return (
      <section className={`${CARD_ACTIVE} animate-fade-in`} aria-label={t('status.title')}>
        <StatusCard
          progress={progress}
          keyword={keyword}
          estimatedSeconds={estimatedSeconds ?? null}
        />
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className={`${CARD_ACTIVE} animate-fade-in`} aria-label={t('results.title', { keyword })}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-brand focus:outline-none min-w-0 rtl:text-right"
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
          <ResultsToolbar
            onCopy={onCopy}
            onExport={onExport}
            copied={copied}
            copyFailed={copyFailed}
            onNewSearch={onNewSearch}
            hasMatches={matches.length > 0}
          />
        </div>
        {youtubeId ? <VideoPlayer ref={playerRef} videoId={youtubeId} /> : null}
        <div className="mt-5">
          <ResultsList
            matches={matches}
            keyword={keyword}
            onSeek={onSeek}
            onClear={onClear}
            matchLimit={matchLimit}
            currentPlayingTimestamp={currentPlayingTimestamp}
            youtubeId={youtubeId}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={`${CARD_ACTIVE} animate-fade-in`} role="alert">
      <ErrorView message={errorText} onRetry={onRetry} />
    </section>
  );
}
