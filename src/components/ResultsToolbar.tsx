import { useTranslation } from 'react-i18next';
import { IconCopy, IconDownload } from './icons';

interface Props {
  onCopy: () => void;
  onExport: () => void;
  copied: boolean;
  copyFailed?: boolean;
  onNewSearch?: () => void;
  hasMatches: boolean;
}

const BUTTON =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100';

/** Wrapping actions and a separate full-width feedback row below the headline. */
export function ResultsToolbar({
  onCopy,
  onExport,
  copied,
  copyFailed,
  hasMatches,
  onNewSearch,
}: Props) {
  const { t } = useTranslation();
  const copyLabel = copied ? t('results.copied') : t('results.copy');

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {onNewSearch ? (
          <button type="button" className={BUTTON} onClick={onNewSearch}>
            {t('actions.newSearch')}
          </button>
        ) : null}
        <button
          type="button"
          className={BUTTON}
          onClick={onCopy}
          aria-label={copyLabel}
          disabled={!hasMatches}
          title={hasMatches ? t('results.copy') : t('results.noMatchesTooltip')}
        >
          <IconCopy />
          {copyLabel}
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={onExport}
          disabled={!hasMatches}
          title={hasMatches ? t('results.export') : t('results.noMatchesTooltip')}
        >
          <IconDownload />
          {t('results.export')}
        </button>
      </div>
      <p
        role="status"
        aria-label={t('results.copyStatus')}
        aria-live="polite"
        aria-atomic="true"
        className={copyFailed
          ? 'w-full min-w-0 text-start text-sm font-medium text-danger [overflow-wrap:anywhere]'
          : 'sr-only'}
      >
        {copyFailed ? t('results.copyFailed') : copied ? t('results.copied') : ''}
      </p>
    </div>
  );
}
