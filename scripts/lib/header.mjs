import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The site header for statically generated pages.
 *
 * The React `SiteHeader` cannot be reused here: the blog, policy and 404 pages
 * are plain HTML with no JavaScript, so the chrome has to be rendered as markup.
 * This mirrors `src/components/SiteHeader.tsx` — same wordmark, same two nav
 * items, same language pill, same sign-in pill, same three-track layout and the
 * same colours and spacing. `src/__tests__/siteHeader.test.tsx` pins the parity
 * that is checkable from the built files.
 *
 * Three deliberate differences from the React header, all forced by shipping no
 * script:
 *
 * - The nav targets are `/#how-it-works` and `/#why-qfza`, not the bare
 *   `#how-it-works` / `#why-qfza` the app used to emit. Those anchors only exist
 *   on the homepage, so a bare fragment on a static page is a dead link.
 *   Prefixing with `/` resolves on the homepage by the same-page jump and
 *   navigates home from anywhere else, so one markup works in both places.
 * - The language pill is a real link to this page's counterpart rather than the
 *   app's JS dropdown.
 * - The account control is always the signed-out "Sign in" pill linking to
 *   `/login`. It cannot show session state (no JS, no cookies read), so a
 *   signed-out link is the only honest rendering. `AccountMenu` intercepts the
 *   click and routes in-app; here it is a plain path, because a bare `#/login`
 *   would resolve against the current static path and dead-end on the blog post,
 *   and a hash URL in the markup of an indexable page is a ranking liability.
 *
 * This module is deliberately self-contained: the renderers that call it are
 * synchronous, and importing ROOT from blog.mjs would both break that and
 * create an import cycle.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Nav labels and logo alt text, read from the app's own locale files. */
const MESSAGES = {
  en: JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/en.json'), 'utf8')),
  ar: JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/ar.json'), 'utf8')),
};

/**
 * Swap the locale prefix on a path: `/ar/blog/x/` <-> `/blog/x/`, and
 * `/privacy/` <-> `/ar/privacy/`. Valid for every page the static renderers
 * produce because they all follow the same `/<locale>/<section>/...` shape.
 */
export function counterpartPath(path) {
  return path.startsWith('/ar/') ? path.slice(3) : `/ar${path}`;
}

/**
 * Header CSS, scoped to `qlf-` to match the rest of the static renderers.
 *
 * Each rule is a hand translation of one Tailwind class string in
 * `SiteHeader.tsx`; the comment above it names that class string so the two can
 * be diffed. Colours come from the `@theme` tokens in `src/index.css`:
 * `--color-action` (#1e3a8a) for `text-primary`, `--color-action-hover`
 * (#172d6e) for `hover:text-action-hover`, slate-200/100/700 for the greys.
 */
export const HEADER_CSS = `
/* mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-200 pb-3 sm:mb-8 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-y-0 sm:pb-4 */
.qlf-header{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1rem;margin-bottom:1.25rem;border-bottom:1px solid #e2e8f0;padding-bottom:.75rem}
/* order-1 flex shrink-0 items-center rounded-lg transition-transform duration-200 hover:scale-[1.04] sm:justify-self-start */
.qlf-header-logo{order:1;display:inline-flex;flex-shrink:0;align-items:center;border-radius:.5rem;text-decoration:none;transition:transform .2s ease}
.qlf-header-logo:hover{transform:scale(1.04)}
/* h-10 w-auto object-contain sm:h-12 — a 48px wordmark dwarfs a phone
   header, so it steps down to 40px under the sm breakpoint */
.qlf-header-logo img{height:2.5rem;width:auto;display:block;object-fit:contain}
/* order-3 flex w-full items-center justify-center gap-x-8 border-t border-slate-100 pt-3 sm:order-2 sm:w-auto sm:gap-x-6 sm:border-0 sm:pt-0 */
.qlf-header-nav{order:3;display:flex;width:100%;align-items:center;justify-content:center;gap:2rem;border-top:1px solid #f1f5f9;padding-top:.75rem}
/* inline-flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action sm:min-h-0 — 44px tap target on phones, back to the text line on sm+ */
.qlf-header-nav a{display:inline-flex;align-items:center;min-height:44px;border-radius:.375rem;padding:.375rem .625rem;color:#1e3a8a;font-size:.875rem;line-height:1.25rem;font-weight:600;white-space:nowrap;text-decoration:none;transition:color .2s,background-color .2s}
.qlf-header-nav a:hover{background-color:#f1f5f9;color:#172d6e}
/* order-2 flex flex-1 items-center justify-end gap-3 sm:order-3 sm:flex-none sm:justify-self-end */
.qlf-header-actions{order:2;display:flex;flex:1;align-items:center;justify-content:flex-end;gap:.75rem}
/* LanguageToggle + AccountMenu pill shape: inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow — min-h-11 is the 44px touch target the React pills carry */
.qlf-pill{display:inline-flex;align-items:center;gap:.5rem;min-height:44px;border:1px solid #e2e8f0;border-radius:9999px;background:#fff;padding:.5rem 1rem;color:#334155;font-size:.875rem;line-height:1.25rem;font-weight:600;white-space:nowrap;text-decoration:none;box-shadow:0 1px 2px 0 rgb(0 0 0 / 5%);transition:all .2s ease}
.qlf-pill:hover{border-color:#cbd5e1;box-shadow:0 1px 3px 0 rgb(0 0 0 / 10%)}
/* text-primary on the pill (AccountMenu) */
.qlf-pill-primary{color:#1e3a8a}
.qlf-pill svg{width:1rem;height:1rem;flex:none}
@media (min-width:640px){
  .qlf-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;row-gap:0;margin-bottom:2rem;padding-bottom:1rem}
  .qlf-header-logo{justify-self:start}
  .qlf-header-logo img{height:3rem}
  .qlf-header-nav{order:2;width:auto;gap:1.5rem;border-top:0;padding-top:0}
  .qlf-header-nav a{min-height:0}
  .qlf-header-actions{order:3;flex:none;justify-self:end}
}
`;

/**
 * @param locale  current page locale, 'en' | 'ar'
 * @param path    current page path, used to build the language counterpart link
 * @param options `language: false` drops the language pill. The 404 document
 *   needs that: it already renders both languages side by side, and every
 *   static page lives at one path per locale, so a "switch to the other
 *   language" link would have no counterpart to point at.
 */
export function renderHeader(locale, path, { language = true } = {}) {
  const t = MESSAGES[locale];
  const isArabic = locale === 'ar';
  const other = isArabic ? 'en' : 'ar';
  const otherLabel = isArabic ? 'English' : 'العربية';

  // The Arabic wordmark keeps the icon on the right, so it uses logo.svg rather
  // than logo-en.svg. Matches the React Logo component.
  const logo = isArabic ? '/logo.svg' : '/logo-en.svg?v=icon-left';

  const langPill = language
    ? `<a class="qlf-pill" href="${counterpartPath(path)}" hreflang="${other}" lang="${other}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg><span>${otherLabel}</span></a>`
    : '';

  // IconLock(size={16}) copied from src/components/icons.tsx.
  const signIn = `<a class="qlf-pill qlf-pill-primary" href="/login"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>${t.auth.nav.signIn}</span></a>`;

  return `<header class="qlf-header">
<a class="qlf-header-logo" href="/" aria-label="${t.nav.home}"><img src="${logo}" alt="${t.app.logoAlt}" width="124" height="48"></a>
<nav class="qlf-header-nav" aria-label="${t.nav.primary}">
<a href="/#how-it-works">${t.nav.howItWorks}</a>
<a href="/#why-qfza">${t.nav.whyQfza}</a>
</nav>
<div class="qlf-header-actions">
${langPill}
${signIn}
</div>
</header>`;
}
