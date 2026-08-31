import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children?: ReactNode;
}

/** Landing hero headline with a centered search slot. */
export function Hero({ children }: Props) {
  const { t } = useTranslation();
  return (
    <section className="hero flex flex-col items-start text-left">
      <h1 className="hero-title max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
        {t('hero.title')}
      </h1>
      <p className="hero-subtitle mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
        {t('hero.subtitle')}
      </p>
      {children ? <div className="mt-6 w-full">{children}</div> : null}
    </section>
  );
}
