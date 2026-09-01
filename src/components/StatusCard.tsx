import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  progress: number | null;
  keyword?: string;
  skeleton?: boolean;
}

/**
 * Transcription progress card with a spinner, status stepper and an
 * accessible determinate/indeterminate progress bar.
 */
export function StatusCard({ progress, keyword = '', skeleton = false }: Props) {
  const { t } = useTranslation();
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
  const fetchingDone = progress !== null && progress >= 50;
  const progressLabel = indeterminate
    ? t('status.message')
    : t('status.progress', { progress: value });

  return (
    <section
      className="flex flex-col items-center justify-center gap-5 text-center"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
        />
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-[#01124e] focus:outline-none">
          {t('status.title')}
        </h2>
        {keyword ? (
          <p className="max-w-md text-sm text-slate-500" dir="auto">
            {t('status.searchingFor', { keyword })}
          </p>
        ) : null}
      </div>

      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={progressLabel}
        aria-label={t('status.title')}
      >
        {indeterminate ? (
          <div className="progress-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-primary" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${value}%` }}
          />
        )}
      </div>

      <p className="m-0 text-sm text-slate-600">{progressLabel}</p>

      <ol className="mx-auto flex max-w-sm list-none flex-col gap-2 text-start">
        <li
          className={`flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
            fetchingDone ? 'text-emerald-600' : 'text-slate-700'
          }`}
          aria-current={fetchingDone ? undefined : 'step'}
        >
          {fetchingDone ? <CheckIcon /> : <PendingIcon />}
          {t('status.fetching')}
        </li>
        <li
          className={`flex items-center gap-2 text-sm transition-colors duration-300 ${
            fetchingDone ? 'text-slate-700 font-medium' : 'text-slate-500'
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
      className="h-5 w-5 shrink-0 text-emerald-500"
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
