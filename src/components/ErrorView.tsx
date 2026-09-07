import { useEffect, useId, useRef } from 'react';
import { isReadingHelp } from '../utils/focus';
import { useTranslation } from 'react-i18next';

interface SecondaryAction {
  label: string;
  onClick: () => void;
}

interface Props {
  message: string;
  onRetry: () => void;
  secondaryAction?: SecondaryAction;
  retryHint?: string;
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

/** Centered error state with a warning icon and retry / secondary actions. */
export function ErrorView({ message, onRetry, secondaryAction, retryHint }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const hintId = useId();

  useEffect(() => {
    if (!isReadingHelp()) containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col items-center justify-center gap-4 py-8 text-center focus:outline-none"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"
      >
        <WarningIcon />
      </span>
      <p className="max-w-md text-base text-slate-600">{t(message, { defaultValue: message })}</p>
      {retryHint ? (
        <p id={hintId} className="max-w-md text-sm text-muted">{retryHint}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {secondaryAction ? (
          <button
            type="button"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          onClick={onRetry}
          aria-describedby={retryHint ? hintId : undefined}
        >
          {t('actions.retry')}
        </button>
      </div>
    </div>
  );
}
