import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';

interface Props {
  progress: number | null;
  keyword?: string;
  estimatedSeconds?: number | null;
  skeleton?: boolean;
  /** Optional abort affordance shown while the job is running — lets mobile
   *  users cancel without scrolling back up to the (read-only) form. */
  onCancel?: () => void;
}

/**
 * Transcription progress card with a spinner, status stepper and an
 * accessible determinate/indeterminate progress bar. Memoized so a parent
 * re-render (e.g. the App that owns many other search callbacks) doesn't
 * rebuild the spinner/bar unless one of its own props actually changes.
 */
export const StatusCard = memo(function StatusCard({
  progress,
  keyword = '',
  estimatedSeconds = null,
  skeleton = false,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const isRtl = getLanguage() === 'ar';
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (skeleton) {
    return (
      <section aria-busy="true" className="space-y-3">
        <div className="h-5 w-2/5 animate-pulse rounded-md bg-slate-200" />
        <div className="h-3.5 w-3/5 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-4 h-14 animate-pulse rounded-xl bg-slate-200" />
      </section>
    );
  }

  const indeterminate = progress === null;
  const value = progress ?? 0;
  // Mirrors App.tsx PROGRESS_MAX — the cap the counter parks on while it waits,
  // so a job stuck at 90% gets an explicit "still working" signal instead of
  // looking like a hang.
  // Parked at the cap only while it's still waiting: once the job completes
  // App sets progress=100 before the phase flips, and 100 must not read as a stall.
  const atStallCap = !indeterminate && value >= 90 && value < 100;
  const fetchingDone = progress !== null && progress >= 50;
  const progressLabel = indeterminate
    ? t('status.message')
    : t('status.progress', { progress: value });
  const etaLabel =
    estimatedSeconds !== null && estimatedSeconds !== undefined
      ? estimatedSeconds >= 60
        ? t('status.estimatedTimeMinutes', {
            count: Math.max(1, Math.round(estimatedSeconds / 60)),
          })
        : t('status.estimatedTime', { seconds: estimatedSeconds })
      : null;
  // Fill the bar to the logged progress. A `scaleX` transform (GPU-composited,
  // no repaint) with the origin at the leading edge is cheaper than animating
  // `clip-path`, which forces a repaint on every tick.
  const fillScale = value / 100;
  // Keep the readout inside the track's flanks so it never hangs off the edge.
  const chipPct = Math.min(92, Math.max(6, value));

  return (
    <section
      className="flex flex-col items-center justify-center gap-5 text-center"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
        />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold text-brand focus:outline-none"
        >
          {t('status.title')}
        </h2>
        {keyword ? (
          <p className="max-w-md text-sm text-slate-500" dir="auto">
            {t('status.searchingFor', { keyword })}
          </p>
        ) : null}
      </div>

      {/* Slim track with the % riding on the fill's leading edge. */}
      <div className="relative w-full max-w-md">
        <div
          className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-inset ring-slate-200/80"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuetext={progressLabel}
          aria-label={t('status.title')}
        >
          {indeterminate ? (
            <div className="progress-indeterminate absolute inset-y-0 w-1/3 bg-gradient-to-r from-accent-strong via-accent to-accent rtl:bg-gradient-to-l">
              <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/25" />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 transition-transform duration-500 ease-out"
              style={{
                transform: `scaleX(${fillScale})`,
                transformOrigin: isRtl ? 'right' : 'left',
                willChange: 'transform',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-strong via-accent to-accent rtl:bg-gradient-to-l">
                {/* Glossy top sheen, like light catching the pill's crown. */}
                <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/25" />
                {/* Slow light sweep that keeps the fill feeling alive (no
                    blur — a solid-gradient edge composites rather than repaints). */}
                <span className="progress-sheen absolute inset-y-0 w-2/5 bg-white/40" />
              </div>
            </div>
          )}
        </div>

        {/* Floating readout chip pinned to the fill's leading edge. */}
        {!indeterminate ? (
          <span
            className="pointer-events-none absolute -top-4 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-brand shadow-[0_2px_8px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/70 transition-[left,right] duration-500 ease-out"
            style={isRtl ? { right: `${chipPct}%` } : { left: `${chipPct}%` }}
          >
            {progressLabel}
          </span>
        ) : null}
      </div>

      {indeterminate ? (
        <p className="m-0 max-w-md text-sm text-slate-600">{progressLabel}</p>
      ) : null}
      {etaLabel ? (
        <p className="m-0 text-xs text-slate-500">
          {etaLabel}
        </p>
      ) : null}
      {atStallCap ? (
        <p className="m-0 flex items-center gap-2 text-sm font-medium text-slate-600">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent"
          />
          {t('status.stillWorking')}
        </p>
      ) : null}

      <ol className="mx-auto flex max-w-sm list-none flex-col gap-2 text-start">
        <li
          className={`flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
            fetchingDone ? 'text-success' : 'text-slate-700'
          }`}
          aria-current={fetchingDone ? undefined : 'step'}
        >
          {fetchingDone ? <CheckIcon /> : <PendingIcon />}
          {t('status.fetching')}
        </li>
        <li
          className={`flex items-center gap-2 text-sm transition-colors duration-300 ${
            fetchingDone ? 'text-slate-700 font-medium' : 'text-muted'
          }`}
          aria-current={fetchingDone ? 'step' : undefined}
        >
          <PendingIcon active={fetchingDone} />
          {t('status.finding')}
        </li>
      </ol>

      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          {t('actions.cancelSearch')}
        </button>
      ) : null}
    </section>
  );
});

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-success"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PendingIcon({ active = true }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 shrink-0 text-primary ${active ? 'animate-spin' : ''}`}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.8 2.8a1 1 0 001.4-1.414L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
