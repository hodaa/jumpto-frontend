/**
 * The one place that knows what a URL on this site means.
 *
 * Routing here is hand-rolled (no router library) because the site is one
 * document plus a handful of generated static pages, so a library would be more
 * configuration than code. Everything that has to agree about a URL — the router,
 * the canonical/robots metadata, the link components, the Vercel rewrites and the
 * tests — derives from this table instead of repeating literals.
 *
 * Two kinds of URL live here, and keeping them apart is the whole point:
 *
 * - SPA routes are client-rendered views. Google gets an empty document, so they
 *   are `noindex` and never appear in the sitemap. They need a Vercel rewrite so
 *   a direct hit is not a 404.
 * - Static pages are real generated documents with their own title, description,
 *   canonical and hreflang. They are indexable and listed in the sitemap, and a
 *   link to one is a real document navigation, never a soft one.
 *
 * Trailing slash policy: static pages are directories (`/about/`), which is how
 * they already ship — `/privacy/`, `/faq/`, `/blog/<post>/`. SPA routes are not
 * directories and stay bare (`/login`), matching the paths the backend puts in
 * emailed links and the ones vercel.json already rewrites. Both forms of every
 * SPA route resolve: `routeFromPath` strips the slash, so a hand-typed
 * `/login/` or a mail client's trailing slash still lands on the right view.
 */

/** Client-rendered views. */
export type Route =
  | 'home'
  | 'contact'
  | 'login'
  | 'register'
  | 'reset-password'
  | 'verify-email'
  | 'history'
  | 'profile';

/** Canonical clean path for each SPA route. No hash, ever. */
export const ROUTE_PATH: Record<Route, string> = {
  home: '/',
  // A static document (crawlable content, its own canonical) that the SPA then
  // mounts over so the live contact form works. See SPA_OWNED_METADATA.
  contact: '/contact/',
  login: '/login',
  register: '/register',
  'reset-password': '/reset-password',
  'verify-email': '/verify-email',
  history: '/history',
  profile: '/profile',
};

/**
 * Routes whose <head> the SPA is allowed to rewrite.
 *
 * `contact` is deliberately absent. Its document is generated with its own
 * title, description and canonical by scripts/build-legal.mjs; letting the app
 * overwrite them on mount would replace a page-specific canonical with the
 * homepage one — the exact duplicate-content bug the static renderer exists to
 * prevent. App routes have no generated document, so the app owns their metadata.
 */
export const SPA_OWNED_METADATA: ReadonlySet<Route> = new Set<Route>([
  'home',
  'login',
  'register',
  'reset-password',
  'verify-email',
  'history',
  'profile',
]);

/** Routes that must never be indexed: no crawlable content, no search intent. */
export const NOINDEX_ROUTES: ReadonlySet<Route> = new Set<Route>([
  'login',
  'register',
  'reset-password',
  'verify-email',
  'history',
  'profile',
]);

/**
 * Paths served as generated static documents, longest prefix first.
 *
 * Used to decide whether a link is a soft in-app navigation or a real document
 * load. Anything under these prefixes exists as a file in dist/, so navigating
 * "softly" would leave the visitor on the previous document while the address bar
 * claims otherwise — and a reload would land them somewhere different.
 */
export const STATIC_PATH_PREFIXES: readonly string[] = [
  '/blog/',
  '/privacy/',
  '/faq/',
  '/about/',
  '/terms/',
  '/contact/',
];

/** The prefix that carries the Arabic locale in a document path. */
const ARABIC_PREFIX = '/ar';

/** True when `path` is a generated static document rather than an SPA view. */
export function isStaticPath(path: string): boolean {
  // Compare normalized, so `/about` and `/about/` are recognised as the one
  // document they are. Matching the raw string instead would quietly treat the
  // slashless spelling as an app view — and a soft navigation to `/about` would
  // leave the visitor on the page they started from while the address bar and a
  // reload both disagree.
  const normalized = normalizePath(path);
  const matches = STATIC_PATH_PREFIXES.some(
    (prefix) => normalized === normalizePath(prefix) || normalized.startsWith(prefix),
  );
  if (matches) return true;
  // Arabic lives under a `/ar` prefix, so every one of those prefixes has a real
  // counterpart at `/ar/<slug>/` that is also a file in dist/. Listing them twice
  // would rot the moment a page is added to only one of the two lists, so the
  // prefix is stripped and the same list answers for both locales.
  return normalized.startsWith(`${ARABIC_PREFIX}/`) || normalized === ARABIC_PREFIX
    ? isStaticPath(normalized.slice(ARABIC_PREFIX.length))
    : false;
}

/**
 * The same generated document in the requested locale, or null if the path is not
 * a document at all.
 *
 * The two locales are separate *documents*, not one document in two languages, so
 * switching locale on a generated page has to be a real navigation. Flipping the UI
 * language in place would leave Arabic chrome wrapped around English copy that was
 * baked into the HTML at build time — and would strand the visitor on a page whose
 * metadata deliberately never follows an in-app language change.
 */
export function localizedStaticPath(pathname: string, lang: 'en' | 'ar'): string | null {
  const normalized = normalizePath(pathname);
  if (!isStaticPath(normalized)) return null;
  // Strip the locale prefix only from the front: a slug is free to contain the
  // letters "ar" and `/blog/ar/` must not lose its middle segment.
  const base =
    (normalized.startsWith(`${ARABIC_PREFIX}/`)
      ? normalized.slice(ARABIC_PREFIX.length)
      : normalized) + '/';
  return lang === 'ar' ? `${ARABIC_PREFIX}${base}` : base;
}

/** Drop a trailing slash, keeping the root as `/`. */
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** The SPA route a path belongs to, or null when the host serves that path. */
export function routeFromPath(pathname: string): Route | null {
  const target = normalizePath(pathname);
  for (const [route, path] of Object.entries(ROUTE_PATH) as [Route, string][]) {
    if (normalizePath(path) === target) return route;
  }
  // A locale prefix is transparent here too, exactly as it is for documents.
  // Without this, `/ar/contact/` matches nothing and falls through to `home`,
  // which renders the landing page on top of the Arabic contact document and
  // stamps the homepage's title and description over that page's own.
  if (target.startsWith(`${ARABIC_PREFIX}/`))
    return routeFromPath(target.slice(ARABIC_PREFIX.length));
  return null;
}

/**
 * The route a legacy `#/name` fragment points at, or null.
 *
 * Links with `/#/login` were emailed, bookmarked and pasted before the move to
 * clean paths. They still resolve, and the router rewrites the address bar to the
 * clean path, so an old link neither 404s nor leaves a second indexable URL for
 * the same view behind. Never used to *build* a URL — `ROUTE_PATH` does that.
 */
export function legacyHashRoute(hash: string): Route | null {
  const raw = hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];
  return raw in ROUTE_PATH ? (raw as Route) : null;
}
