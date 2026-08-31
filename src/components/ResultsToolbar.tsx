import { useTranslation } from 'react-i18next';

interface Props {
  onCopy: () => void;
  onExport: () => void;
  copied: boolean;
}

export function ResultsToolbar({ onCopy, onExport, copied }: Props) {
  const { t } = useTranslation();

  return (
    <div className="results-canvas__actions">
      <button type="button" className="toolbar-btn" onClick={onCopy}>
        {copied ? t('results.copied') : t('results.copy')}
      </button>
      <button type="button" className="toolbar-btn" onClick={onExport}>
        {t('results.export')}
      </button>
    </div>
  );
}
