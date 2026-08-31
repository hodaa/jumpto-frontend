import { useTranslation } from 'react-i18next';

interface Props {
  message: string;
  onRetry: () => void;
}

/** Displays an error message with an optional retry action. */
export function ErrorView({ message, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <section className="error-view" role="alert">
      <p className="error-text">{t(message, { defaultValue: message })}</p>
      <button type="button" className="submit-button" onClick={onRetry}>
        {t('actions.retry')}
      </button>
    </section>
  );
}
