import { useTranslation } from 'react-i18next';

interface Props {
  progress: number | null;
  skeleton?: boolean;
}

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
    <section className="status-card" aria-live="polite" aria-busy="true">
      <h2 className="status-card__title">{t('status.title')}</h2>
      <div
        className="status-card__progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className="status-card__progress-fill" style={{ width: `${value}%` }} />
      </div>
      <p className="status-card__message">
        {progress !== null ? t('status.progress', { progress: value }) : t('status.message')}
      </p>
    </section>
  );
}
