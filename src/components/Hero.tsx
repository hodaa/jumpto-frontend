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
      <div className="relative inline-block text-center">
        <h1
          id="search-heading"
          className={`bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent ${
            compact
              ? 'text-xl font-extrabold leading-tight sm:text-2xl'
              : 'text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl'
          }`}
        >
          {t('hero.title')}
        </h1>
        <div className="hero-accent-bar absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
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
