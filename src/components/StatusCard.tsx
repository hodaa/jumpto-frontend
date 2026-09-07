import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';

interface Props {
  progress: number | null;
  keyword?: string;
  estimatedSeconds?: number | null;
  skeleton?: boolean;
}

/**
 * Transcription progress card with a spinner, status stepper and an
 * accessible determinate/indeterminate progress bar.
 */
export function StatusCard({
  progress,
  keyword = '',
  estimatedSeconds = null,
  skeleton = false,
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
  const atStallCap = !indeterminate && value >= 90;
  const fetchingDone = progress !== null && progress >= 50;
  const progressLabel = indeterminate
    ? t('status.message')
    : t('status.progress', { progress: value });
  const etaLabel =
    estimatedSeconds !== null && estimatedSeconds !== undefined
      ? t('status.estimatedTime', { seconds: estimatedSeconds })
      : null;
  // Clip the filled bar (and its in-bar label) to the logged progress so the
  // percentage is always centered inside the track no matter the fill width.
  const fillClipPath = isRtl
    ? `inset(0 0 0 ${100 - value}% round 9999px)`
    : `inset(0 ${100 - value}% 0 0 round 9999px)`;

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

      <div
        className="relative h-8 w-full max-w-md overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={progressLabel}
        aria-label={t('status.title')}
      >
        {indeterminate ? (
          <div className="progress-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-accent" />
        ) : (
          <>
            {/* Dark label stays readable across the unfilled track. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full text-sm font-bold tabular-nums text-slate-700"
            >
              {progressLabel}
            </span>
            {/* White label clipped to the filled segment — flips colour exactly
                at the progress edge, so it is legible at any fill width. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 transition-[clip-path] duration-500 ease-out"
              style={{ clipPath: fillClipPath }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-accent text-sm font-bold tabular-nums text-white">
                {progressLabel}
              </span>
            </span>
          </>
        )}
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
    </section>
  );
}

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
