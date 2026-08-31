import { useTranslation } from 'react-i18next';

interface Props {
  progress: number | null;
  skeleton?: boolean;
}

/**
 * Transcription progress card with a spinner, status stepper and an
 * accessible determinate/indeterminate progress bar.
 */
export function StatusCard({ progress, skeleton = false }: Props) {
  const { t } = useTranslation();

  if (skeleton) {
    return (
      <section className="status-card" aria-busy="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" />
        <div className="skeleton skeleton--card-sm" style={{ marginTop: '1rem' }} />
      </section>
    );
  }

  const value = progress ?? 0;

  return (
    <section className="status-card space-y-5 p-2 text-center" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-12 w-12 animate-spin rounded-full border-4 border-[#00bff8]/20 border-t-[#00bff8]"
        />
        <h2 className="text-lg font-bold text-slate-800">{t('status.title')}</h2>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#081e54] to-[#0e7490] transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>

      <p className="m-0 text-sm text-slate-600">
        {progress !== null ? t('status.progress', { progress: value }) : t('status.message')}
      </p>

      <ol className="mx-auto flex max-w-sm list-none flex-col gap-2 text-left">
        <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <CheckIcon />
          {t('status.fetching')}
        </li>
        <li className="flex items-center gap-2 text-sm text-slate-500">
          <PendingIcon />
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

function PendingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 animate-spin text-[#00bff8]"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.8 2.8a1 1 0 001.4-1.414L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
