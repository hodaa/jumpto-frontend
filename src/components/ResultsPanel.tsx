import { useEffect, useId, useRef } from 'react';
import { isReadingHelp } from '../utils/focus';
import { formatYouTubeTime } from '../utils/youtube';
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
  matches: SearchMatch[];
  noSpeech?: boolean;
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
  onPlaybackChange?: (seconds: number | null) => void;
  onClear: () => void;
  onNewSearch?: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  currentPlayingTimestamp?: number | null;
  /** Present when the page was opened from a shared-moment link (?v=&t=). */
  sharedSeconds?: number | null;
  /** The keyword a replayed moment belongs to; null for a bare ?v=&t= link. */
  sharedKeyword?: string | null;
  /**
   * Every result the replayed search found, so the saved search is shown again
   * rather than trimmed to one moment. Null for a bare ?v=&t= link, which knows
   * of a second and nothing else.
   */
  sharedMatches?: SearchMatch[] | null;
  /**
   * False when the replayed search matched nothing. Distinct from an empty
   * `sharedMatches`: "found nothing" is a finished, empty result, not a search
   * whose results have yet to arrive.
   */
  sharedMatched?: boolean;
}

// Idle panel: a dashed brand-orange border with a muted background and no
// shadow. The illustrative preview stays visually distinct from active results.
const CARD_IDLE =
  'rounded-2xl border border-dashed border-accent bg-slate-50/70 p-6 shadow-none sm:p-8 h-full transition-all duration-300';
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
            <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-brand tabular-nums">
              {row.time}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {row.widths.map((width, index) => (
                <span
                  key={width}
                  className={`h-2 rounded-full ${index === 0 ? 'bg-action/70' : 'bg-slate-300/70'}`}
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
function ResultsPanelContent({
  phase,
  progress,
  matches,
  noSpeech,
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
  onPlaybackChange,
  onClear,
  onNewSearch,
  onRetry,
  onCancel,
  currentPlayingTimestamp,
  sharedSeconds = null,
  sharedKeyword = null,
  sharedMatches = null,
  sharedMatched = true,
}: Props) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (phase === 'done' && !isReadingHelp()) {
      headingRef.current?.focus();
    }
  }, [phase]);

  if (phase === 'idle') {
    return (
      <section
        className={`${CARD_IDLE} flex min-h-[300px] flex-col items-center justify-center gap-6`}
        aria-label={t('results.idleTitle')}
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent/15 to-primary/10 text-accent"
          >
            <IconTarget size={26} />
          </span>
          <p className="text-lg font-bold text-muted-strong">{t('results.idleTitle')}</p>
          <p className="-mt-1 max-w-md text-sm text-muted">{t('results.idle')}</p>
        </div>
        {/* The mock is a dimmed, disabled preview so it can never be mistaken
            for a live, interactive result list. */}
        <div className="flex w-full flex-col items-center gap-2.5 opacity-80">
          <IdleMockup />
          <p className="m-0 text-[11px] font-semibold tracking-wide text-muted-strong">
            {t('results.idleMockLabel')}
          </p>
        </div>
      </section>
    );
  }

  if (phase === 'processing') {
    return (
      <section className={`${CARD_ACTIVE} animate-fade-in`} aria-label={t('status.title')}>
        <StatusCard progress={progress} keyword={keyword} onCancel={onCancel} />
      </section>
    );
  }

  // A saved search that matched nothing replays as the empty result it was. The
  // moment block is skipped entirely: it is built around a match existing, and
  // inventing one at 00:00 would tell the visitor their phrase was found.
  if (phase === 'done' && sharedSeconds !== null && !sharedMatched) {
    return (
      <section className={`${CARD_ACTIVE} animate-fade-in`} aria-labelledby={headingId}>
        <div className="mb-5 flex min-w-0 flex-col gap-3">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="w-full min-w-0 text-lg font-bold text-brand focus:outline-none rtl:text-right [overflow-wrap:anywhere]"
            dir="auto"
          >
            {(sharedKeyword ?? keyword) ? (
              <Trans
                i18nKey="results.title"
                values={{ keyword: sharedKeyword ?? keyword }}
                components={{
                  keyword: <bdi className="results-keyword" dir="auto" />,
                }}
              />
            ) : (
              // A `?v=…&t=0&empty=1` link knows the search found nothing but not
              // what it searched for: the keyword is deliberately kept out of the
              // URL, so it is not there to name. "Matches for "" " would be
              // worse than saying what is actually true.
              t('results.noKeywordTitle')
            )}
          </h2>
        </div>
        {youtubeId ? (
          <VideoPlayer ref={playerRef} videoId={youtubeId} onPlaybackChange={onPlaybackChange} />
        ) : null}
        <div className="mt-5">
          <ResultsList
            matches={[]}
            keyword={sharedKeyword ?? keyword}
            noSpeech={noSpeech}
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

  if (phase === 'done' && sharedSeconds !== null) {
    // A replayed search looks like the search it came from: same heading, same
    // match rows, same active treatment. Every saved match is listed when the
    // history entry carried them; only a bare ?v=&t= link is trimmed to the one
    // moment it actually knows about.
    const momentTimestamp = formatYouTubeTime(sharedSeconds);
    // An empty saved list means the search found nothing and was recorded anyway;
    // a null one means we were handed a bare moment and have nothing else to
    // show, so the single row below stands in for it.
    const rows: SearchMatch[] =
      sharedMatches && sharedMatches.length > 0
        ? sharedMatches
        : [
            {
              progress_seconds: sharedSeconds,
              timestamp: momentTimestamp,
              text_snippet: null,
            },
          ];
    return (
      <section className={`${CARD_ACTIVE} animate-fade-in`} aria-labelledby={headingId}>
        <div className="mb-5 flex min-w-0 flex-col gap-3">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="w-full min-w-0 text-lg font-bold text-brand focus:outline-none rtl:text-right [overflow-wrap:anywhere]"
            dir="auto"
          >
            {sharedKeyword ? (
              <Trans
                i18nKey="results.title"
                values={{ keyword: sharedKeyword }}
                components={{
                  keyword: <bdi className="results-keyword" dir="auto" />,
                }}
              />
            ) : (
              t('shared.title', { timestamp: momentTimestamp })
            )}
          </h2>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-strong">
              <IconTarget size={14} />
              {t('shared.savedBadge')}
            </span>
            <p className="text-sm text-muted rtl:text-right">{t('shared.hint')}</p>
          </div>
        </div>
        {youtubeId ? (
          <VideoPlayer ref={playerRef} videoId={youtubeId} onPlaybackChange={onPlaybackChange} />
        ) : null}
        <div className="mt-5">
          <ResultsList
            // The same list the search view renders, not a hand-rolled copy of it.
            // MatchRow decides row-vs-column with a container query against the
            // `@container/matches` wrapper ResultsList provides; render the rows
            // directly and that wrapper is gone, so every replayed match stacks its
            // share and YouTube buttons onto a second line — a visible difference
            // from the search the visitor is being shown as a replay of.
            matches={rows}
            keyword={sharedKeyword ?? keyword}
            // Only a bare moment link has no phrase behind it; a replayed search
            // is named after its keyword exactly as the search it replays is.
            listLabel={sharedKeyword ? undefined : t('shared.momentListLabel')}
            noSpeech={noSpeech}
            onSeek={onSeek}
            onClear={onClear}
            matchLimit={matchLimit}
            // The player is parked on the saved moment, so that row is the active
            // one — the same row, and the same accent ring, the search view marks.
            currentPlayingTimestamp={sharedSeconds}
            youtubeId={youtubeId}
          />
        </div>
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className={`${CARD_ACTIVE} animate-fade-in`} aria-labelledby={headingId}>
        <div className="mb-5 flex min-w-0 flex-col gap-3">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="w-full min-w-0 text-lg font-bold text-brand focus:outline-none rtl:text-right [overflow-wrap:anywhere]"
            dir="auto"
          >
            <Trans
              i18nKey="results.title"
              values={{ keyword }}
              components={{
                keyword: <bdi className="results-keyword" dir="auto" />,
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
        {youtubeId ? (
          <VideoPlayer ref={playerRef} videoId={youtubeId} onPlaybackChange={onPlaybackChange} />
        ) : null}
        <div className="mt-5">
          <ResultsList
            matches={matches}
            keyword={keyword}
            noSpeech={noSpeech}
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
    <section className={`${CARD_ACTIVE} animate-fade-in`} aria-label={t('error.title')}>
      <ErrorView message={errorText} onRetry={onRetry} retryHint={t('error.retryHint')} />
    </section>
  );
}

/** Keep one concise search live region mounted and outside the busy status card. */
export function ResultsPanel(props: Props) {
  const { t } = useTranslation();
  const announcement =
    props.phase === 'processing'
      ? // Mirror the existing visual stage threshold; never announce each percentage/ETA tick.
        t(
          props.progress !== null && props.progress >= 50
            ? 'announcements.finding'
            : 'announcements.fetching',
        )
      : props.phase === 'done' && props.sharedSeconds != null && !props.sharedMatched
        ? // A fruitless search has no moment to announce, and "Shared moment at
          // 00:00" would tell a screen-reader user the opposite of what the
          // panel underneath them shows.
          t('announcements.noMatches')
        : props.phase === 'done' && props.sharedSeconds != null
          ? t('shared.title', { timestamp: formatYouTubeTime(props.sharedSeconds) })
          : props.phase === 'done'
            ? t('announcements.complete', {
                summary: t('results.matchCount', { count: props.matches.length }),
              })
            : props.phase === 'error'
              ? t('announcements.failed')
              : '';

  return (
    <>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>
      <ResultsPanelContent {...props} />
    </>
  );
}
