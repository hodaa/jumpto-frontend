import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children?: ReactNode;
}

/** Full-width landing hero headline with a centered search slot. */
export function Hero({ children }: Props) {
  const { t } = useTranslation();
  return (
    <section className="mb-16 flex flex-col items-start text-start">
      <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
        {t('hero.title')}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">{t('hero.subtitle')}</p>
      {children ? <div className="mt-6 w-full">{children}</div> : null}
    </section>
  );
}
