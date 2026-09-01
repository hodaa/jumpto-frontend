import { useTranslation } from 'react-i18next';

interface Props {
  message: string;
  onRetry: () => void;
}

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** Centered error state with a warning icon and a subtle retry action. */
export function ErrorView({ message, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"
      >
        <WarningIcon />
      </span>
      <p className="max-w-md text-sm text-slate-600">{t(message, { defaultValue: message })}</p>
      <button
        type="button"
        className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
        onClick={onRetry}
      >
        {t('actions.retry')}
      </button>
    </div>
  );
}
