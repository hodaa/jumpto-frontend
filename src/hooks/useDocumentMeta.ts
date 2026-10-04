import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SITE_URL } from '../config';
import { NOINDEX_ROUTES, ROUTE_PATH, SPA_OWNED_METADATA, isStaticPath } from '../routes';
import type { Route } from '../routes';

/**
 * Per-route `<head>` management for the client-rendered views.
 *
 * Before this existed, `applyDocumentLanguage` in src/i18n set one title and one
 * description for the whole app and never touched `<link rel="canonical">`. Every
 * view therefore reported the *homepage* canonical — so /login and /history all
 * claimed to be https://qfza.app/, which is a duplicate-content signal pointing
 * the wrong way. Each route now names itself and canonicals to its own path.
 *
 * Routes absent from `SPA_OWNED_METADATA` are left alone on purpose. `contact`
 * is a generated static document with its own title, description and canonical;
 * the app mounts a live form over it, and rewriting its head on mount would
 * replace that page-specific metadata with the app defaults — the precise bug
 * this hook is here to remove.
 *
 * Canonical is absolute (SITE_URL + path), never `location.href`: a canonical
 * built from the current URL would follow a stray query string or fragment into
 * the index, and would make the dev origin self-canonical in a way that differs
 * from what the static renderer writes for the same page.
 */

/** i18n key per route. Dashed route names become camelCase keys. */
const META_KEY: Record<Route, string> = {
  home: 'home',
  login: 'login',
  register: 'register',
  'reset-password': 'resetPassword',
  'verify-email': 'verifyEmail',
  history: 'history',
  profile: 'profile',
  contact: 'contact',
};

/** How to address, and if necessary create, one head tag. */
interface HeadTag {
  selector: string;
  attr: string;
  value: string;
  tag?: string;
  key?: string;
  keyValue?: string;
}

/**
 * Set an attribute on a head tag, creating the tag if it is not there.
 *
 * Upsert rather than update. `index.html` ships a canonical and an `og:url`, but
 * a hook that quietly does nothing when a tag is missing fails open: the route
 * loads, the copy renders, and the page keeps claiming somebody else's canonical
 * — which is the bug this hook was written to remove. Creating the tag means the
 * route's metadata is correct on whatever document it mounts into, including a
 * test environment with an empty <head>.
 *
 * One flat object per tag, so the addressing and the creation spec cannot drift
 * apart the way a positional `selector, attr, value, create` signature does.
 */
function setTag({ selector, attr, value, tag, key, keyValue }: HeadTag): void {
  const existing = document.querySelector(selector);
  if (existing) {
    existing.setAttribute(attr, value);
    return;
  }
  if (!tag || typeof document.createElement !== 'function') return;
  const created = document.createElement(tag);
  if (key && keyValue !== undefined) created.setAttribute(key, keyValue);
  created.setAttribute(attr, value);
  document.head.appendChild(created);
}

const meta = (name: string, value: string, kind: 'name' | 'property' = 'name'): HeadTag => ({
  selector: `meta[${kind}="${name}"]`,
  attr: 'content',
  value,
  tag: 'meta',
  key: kind,
  keyValue: name,
});

/** Create (once) a <meta name="robots"> and return it, or null if unavailable. */
function robotsMeta(): HTMLMetaElement | null {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (existing) return existing;
  if (typeof document.createElement !== 'function') return null;
  const created = document.createElement('meta');
  created.setAttribute('name', 'robots');
  document.head.appendChild(created);
  return created;
}

export function useDocumentMeta(route: Route): void {
  const { t, i18n } = useTranslation();

  // i18n.language is a dependency because a language switch must retranslate the
  // title and description, exactly as it retranslates the page.
  useEffect(() => {
    if (!SPA_OWNED_METADATA.has(route)) return;
    // Belt and braces with the exclusion list above. `useRoute` answers `home` for
    // any path it does not recognise, so a generated page that is hydrated but not
    // in `SPA_OWNED_METADATA` would be handed the *homepage's* title, description
    // and canonical — a page claiming to be /ar/contact/ while calling itself the
    // homepage. Asking the router what kind of path this is cannot go stale when
    // a page is added.
    if (isStaticPath(window.location.pathname)) return;

    const key = META_KEY[route];
    // Home already has copy in `app.*` that index.html ships with; reusing it
    // keeps one source of truth rather than a second, near-identical string.
    const title = route === 'home' ? t('app.pageTitle') : t(`meta.${key}.title`);
    const description = route === 'home' ? t('app.metaDescription') : t(`meta.${key}.description`);
    const canonical = `${SITE_URL}${ROUTE_PATH[route]}`;

    document.title = title;
    setTag(meta('description', description));
    setTag({
      selector: 'link[rel="canonical"]',
      attr: 'href',
      value: canonical,
      tag: 'link',
      key: 'rel',
      keyValue: 'canonical',
    });
    setTag(meta('og:url', canonical, 'property'));
    setTag(meta('og:title', title, 'property'));
    setTag(meta('og:description', description, 'property'));
    setTag(meta('twitter:title', title));
    setTag(meta('twitter:description', description));

    // App views have no content to index. `follow` keeps the crawler moving on to
    // the links they carry (the header, the footer) instead of treating the
    // whole branch as a dead end.
    const robots = robotsMeta();
    robots?.setAttribute(
      'content',
      NOINDEX_ROUTES.has(route) ? 'noindex, follow' : 'index, follow',
    );
  }, [route, i18n.language, t]);
}
