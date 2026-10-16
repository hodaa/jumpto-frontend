import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { localizedStaticPath } from '../routes';
import { RouteLink } from './RouteLink';

/**
 * In-app 404 — what the app renders for a path it does not own.
 *
 * The host answers an unmatched URL with a dedicated static document
 * (scripts/lib/notfound.mjs) before the app ever boots. This view is the same
 * answer for the places that document cannot reach: the dev server falls back
 * to the app for every path, and a host without a 404 rule would otherwise
 * render the homepage at a stranger's address — a soft 404 that tells a
 * crawler the wrong page lives there.
 *
 * Copy mirrors the static document, but in a single language: unlike that
 * document, this view renders after the app knows the visitor's language, so
 * its links cross into the visitor's locale instead of listing both.
 */
export function NotFoundPage() {
  const { t } = useTranslation();
  // The same locale rule as every link to a generated page: the two locales
  // are separate documents, so the link carries the /ar prefix rather than
  // relying on the app to retranslate a page it does not own.
  const lang = getLanguage();
  const blog = localizedStaticPath('/blog/', lang) ?? '/blog/';
  const privacy = localizedStaticPath('/privacy/', lang) ?? '/privacy/';
  const linkClass =
    'inline-flex min-h-11 items-center font-semibold text-accent-strong hover:underline';

  return (
    <section
      aria-labelledby="not-found-heading"
      className="mx-auto flex w-full max-w-xl flex-col items-center text-center"
    >
      <p className="mb-2 text-5xl font-extrabold leading-none tracking-tight text-brand">404</p>
      <h1 id="not-found-heading" className="section-title">
        {t('notFound.heading')}
      </h1>
      <p className="text-muted-strong max-w-md text-lg font-medium leading-relaxed">
        {t('notFound.body')}
      </p>
      <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-border pt-5 text-sm">
        <RouteLink to="home" className={linkClass}>
          {t('notFound.backHome')}
        </RouteLink>
        <RouteLink to={blog} className={linkClass}>
          {t('footer.blog')}
        </RouteLink>
        <RouteLink to={privacy} className={linkClass}>
          {t('footer.privacy')}
        </RouteLink>
      </div>
    </section>
  );
}
