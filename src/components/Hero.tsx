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
      <h1 id="search-heading" className="section-title animate-fade-in">
        {t('hero.title')}
      </h1>
      {/* Subtitle uses the high-contrast `muted-strong` token (slate-700,
          9.4:1 on white) instead of slate-600 so the supporting line stays
          legible under the bright hero headline in both EN and AR. */}
      <p
        className={
          compact
            ? 'text-muted-strong max-w-xl text-[1.0625rem] font-medium leading-relaxed sm:text-lg'
            : 'text-muted-strong max-w-2xl text-lg font-semibold leading-relaxed sm:text-xl'
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
