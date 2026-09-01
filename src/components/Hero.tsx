import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children?: ReactNode;
  compact?: boolean;
}

/** Full-width landing hero headline with a centered search slot. */
export function Hero({ children, compact = false }: Props) {
  const { t } = useTranslation();
  return (
    <section
      className={`flex flex-col items-center text-center animate-fade-in ${compact ? 'mb-5' : 'mb-16'}`}
    >
      <div className="relative inline-block">
        <h1
          id="search-heading"
          className={
            compact
              ? 'text-2xl font-extrabold leading-tight text-[#01124e] sm:text-3xl'
              : 'text-4xl font-extrabold leading-tight text-[#01124e] sm:text-5xl md:text-6xl'
          }
        >
          {t('hero.title')}
        </h1>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#02c1f7] rounded-full" />
      </div>
      <p
        className={
          compact
            ? 'mt-3 max-w-lg text-base leading-relaxed text-slate-600 '
            : 'mt-4 max-w-2xl text-lg font-medium leading-relaxed text-slate-600'
        }
      >
        {t('hero.subtitle')}
      </p>
      {children ? (
        <div className="mt-6 w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}