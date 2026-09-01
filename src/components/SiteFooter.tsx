import { useTranslation } from 'react-i18next';

/** Site-wide footer with a short product note and copyright line. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
      <p>{t('footer.note')}</p>
      <p className="mt-1">{t('footer.rights', { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
