import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

export function Hero({ children }: Props) {
  const { t } = useTranslation();
  return (
    <section className="hero">
      <h1 className="hero-title">{t('hero.title')}</h1>
      <p className="hero-subtitle">{t('hero.subtitle')}</p>
      <div className="hero-search">{children}</div>
    </section>
  );
}
