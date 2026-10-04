import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconExternalLink, IconFacebook, IconLinkedIn } from './icons';

const FACEBOOK_URL = 'https://www.facebook.com/qfzaa/';
const LINKEDIN_URL = 'https://www.linkedin.com/company/qfza';

const linkClass =
  'inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action';

/** Site-wide footer with a short product note, contact link, and copyright line. */
export const SiteFooter = memo(function SiteFooter() {
  const { t, i18n } = useTranslation();
  // The blog is static HTML served at real paths, so link the locale that
  // matches the active UI language (a plain href leaves the SPA, as intended).
  const blogUrl = i18n.language.startsWith('ar') ? '/ar/blog/' : '/blog/';
  // Same reasoning for the policy and the FAQ: they are static pages, and a
  // visitor must be able to reach them in a language they actually read.
  const privacyUrl = i18n.language.startsWith('ar') ? '/ar/privacy/' : '/privacy/';
  const faqUrl = i18n.language.startsWith('ar') ? '/ar/faq/' : '/faq/';
  // Contact is a generated static page too — crawlable copy plus the live form
  // the app mounts over it — so it is linked as a real path, not a route.
  const contactUrl = i18n.language.startsWith('ar') ? '/ar/contact/' : '/contact/';
  const aboutUrl = i18n.language.startsWith('ar') ? '/ar/about/' : '/about/';
  const termsUrl = i18n.language.startsWith('ar') ? '/ar/terms/' : '/terms/';

  const dot = (
    <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
      ·
    </span>
  );
  return (
    <footer
      className="mt-16 border-t border-slate-200 bg-gradient-to-b from-transparent to-slate-50/50 pt-8 pb-4 text-center text-sm text-slate-500 animate-fade-in-up"
      style={{ animationDelay: '0.4s' }}
    >
      <p className="font-medium text-slate-600 mb-2">{t('footer.note')}</p>
      <nav
        aria-label={t('footer.links')}
        className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:gap-1"
      >
        <a
          className="inline-block rounded-md px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          href={contactUrl}
        >
          {t('footer.contact')}
        </a>
        {dot}
        <a className={linkClass} href={aboutUrl}>
          {t('footer.about')}
        </a>
        {dot}
        <a className={linkClass} href={termsUrl}>
          {t('footer.terms')}
        </a>
        {dot}
        <a className={linkClass} href={blogUrl}>
          {t('footer.blog')}
        </a>
        {dot}
        <a className={linkClass} href={faqUrl}>
          {t('footer.faq')}
        </a>
        {dot}
        <a className={linkClass} href={privacyUrl}>
          {t('footer.privacy')}
        </a>
        {dot}
        <a className={linkClass} href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
          <IconLinkedIn size={16} />
          {t('footer.linkedin')}{' '}
          <IconExternalLink size={12} />
          <span className="sr-only">{t('footer.opensInNewTab')}</span>
        </a>
        {dot}
        <a className={linkClass} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
          <IconFacebook size={16} />
          {t('footer.facebook')}{' '}
          <IconExternalLink size={12} />
          <span className="sr-only">{t('footer.opensInNewTab')}</span>
        </a>
      </nav>
      <p className="text-xs text-muted">{t('footer.rights', { year: new Date().getFullYear() })}</p>
    </footer>
  );
});
