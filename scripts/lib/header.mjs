import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The site header for statically generated pages.
 *
 * The React `SiteHeader` cannot be reused here: the blog, policy and 404 pages
 * are plain HTML with no JavaScript, so the chrome has to be rendered as markup.
 * This mirrors `src/components/SiteHeader.tsx` — same wordmark, same two nav
 * items, same language pill, same colours and spacing.
 *
 * One deliberate difference from the React header: the nav targets are
 * `/#how-it-works` and `/#why-qfza`, not the bare `#how-it-works` / `#why-qfza`
 * the app uses. Those anchors only exist on the homepage, so a bare fragment on
 * a static page is a dead link. Prefixing with `/` resolves on the homepage by
 * the same-page jump and navigates home from anywhere else, so one markup works
 * in both places.
 *
 * The language pill is a real link to this page's counterpart rather than the
 * app's JS dropdown, because these pages ship no script.
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

/** Header CSS, scoped to `qlf-` to match the rest of the static renderers. */
export const HEADER_CSS = `
.qlf-header{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1rem;border-bottom:1px solid #e2e8f0;padding-bottom:.75rem;margin-bottom:2.5rem}
.qlf-header-logo{display:inline-flex;align-items:center;border-radius:.5rem;text-decoration:none}
.qlf-header-logo img{height:3rem;width:auto;display:block}
.qlf-header-nav{display:flex;flex:1 1 100%;flex-wrap:wrap;align-items:center;gap:1rem;justify-content:center;border-top:1px solid #f1f5f9;padding-top:.75rem}
.qlf-header-nav a{color:#02275a;font-weight:600;text-decoration:none;font-size:.875rem;white-space:nowrap}
.qlf-header-nav a:hover{color:#ea580c}
.qlf-header-lang{margin-inline-start:auto;display:inline-flex;align-items:center;gap:.5rem;border:1px solid #e2e8f0;border-radius:9999px;background:#fff;padding:.5rem 1rem;font-size:.875rem;font-weight:600;color:#334155;text-decoration:none;white-space:nowrap;order:-1}
.qlf-header-lang:hover{border-color:#cbd5e1;color:#02275a}
.qlf-header-lang svg{width:1rem;height:1rem;flex:none}
@media (min-width:640px){
  .qlf-header{flex-wrap:nowrap;padding-bottom:1rem;margin-bottom:2rem}
  .qlf-header-nav{flex:0 0 auto;order:0;border-top:0;padding-top:0;justify-content:center}
  .qlf-header-lang{order:0;margin-inline-start:0}
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

  const pill = language
    ? `<a class="qlf-header-lang" href="${counterpartPath(path)}" hreflang="${other}" lang="${other}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg><span>${otherLabel}</span></a>`
    : '';

  return `<header class="qlf-header">
<a class="qlf-header-logo" href="/" aria-label="${t.nav.home}"><img src="${logo}" alt="${t.app.logoAlt}" width="124" height="48"></a>
<nav class="qlf-header-nav" aria-label="${t.nav.primary}">
<a href="/#how-it-works">${t.nav.howItWorks}</a>
<a href="/#why-qfza">${t.nav.whyQfza}</a>
</nav>
${pill}
</header>`;
}
