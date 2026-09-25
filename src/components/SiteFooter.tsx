import { memo } from 'react';
import { useTranslation } from 'react-i18next';

/** Site-wide footer with a short product note, contact link, and copyright line. */
export const SiteFooter = memo(function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="mt-16 border-t border-slate-200 bg-gradient-to-b from-transparent to-slate-50/50 pt-8 pb-4 text-center text-sm text-slate-500 animate-fade-in-up"
      style={{ animationDelay: '0.4s' }}
    >
      <p className="font-medium text-slate-600 mb-2">{t('footer.note')}</p>
      <nav aria-label={t('footer.contact')} className="mb-2">
        <a
          className="inline-block rounded-md px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          href="#/contact"
        >
          {t('footer.contact')}
        </a>
      </nav>
      <p className="text-xs text-muted">
        {t('footer.rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
});
