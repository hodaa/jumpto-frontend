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
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100';

/** Toolbar actions shown beside the results headline. */
export function ResultsToolbar({ onCopy, onExport, copied, copyFailed, hasMatches }: Props) {
  const { t } = useTranslation();
  const copyLabel = copied ? t('results.copied') : t('results.copy');

  return (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      <div aria-live="polite" className="sr-only">
        {copied ? t('results.copied') : copyFailed ? t('results.copyFailed') : ''}
      </div>
      {copyFailed ? (
        <span role="status" className="w-full text-left text-xs font-medium text-red-600 sm:w-auto">
          {t('results.copyFailed')}
        </span>
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
  );
}
