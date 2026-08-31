import { useTranslation } from 'react-i18next';

/** Site-wide footer with a short product note and copyright line. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <p className="footer-note">{t('footer.note')}</p>
      <p className="footer-rights">{t('footer.rights', { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
