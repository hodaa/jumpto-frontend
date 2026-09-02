import { useTranslation } from 'react-i18next';

/** Site-wide footer with a short product note and copyright line. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="mt-16 border-t border-slate-200 bg-gradient-to-b from-transparent to-slate-50/50 pt-8 pb-4 text-center text-sm text-slate-500 animate-fade-in-up"
      style={{ animationDelay: '0.4s' }}
    >
      <p className="font-medium text-slate-600 mb-2">{t('footer.note')}</p>
      <p className="text-xs text-slate-400 hover:text-slate-500 transition-colors">
        {t('footer.rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
