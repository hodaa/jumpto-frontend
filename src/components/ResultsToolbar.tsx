import { useTranslation } from 'react-i18next';

interface Props {
  onCopy: () => void;
  onExport: () => void;
  copied: boolean;
}

const BUTTON =
  'inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300';

/** Secondary action buttons shown beside the results headline. */
export function ResultsToolbar({ onCopy, onExport, copied }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" className={BUTTON} onClick={onCopy}>
        <span aria-hidden="true">⧉</span>
        {copied ? t('results.copied') : t('results.copy')}
      </button>
      <button type="button" className={BUTTON} onClick={onExport}>
        <span aria-hidden="true">⬇</span>
        {t('results.export')}
      </button>
    </div>
  );
}
