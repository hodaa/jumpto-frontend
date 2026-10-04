import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The site footer for statically generated pages.
 *
 * Mirrors `src/components/SiteFooter.tsx` — same product note, same eight links
 * (contact, about, terms, blog, FAQ, policy, LinkedIn, Facebook) in the same
 * order, same separator dots, same rights line.
 * `src/__tests__/staticFooter.test.ts` pins the parity that is checkable from
 * the built files.
 *
 * Every link is an absolute path in the page's own locale, matching
 * `SiteFooter`'s choice from the active UI language. Contact used to point at
 * `/#/contact`, which was a hash route; it is a generated static page now, like
 * the rest of this list, so `/contact/` is both the crawlable URL and the one a
 * visitor follows.
 *
 * Self-contained for the same reason `header.mjs` is: the renderers that call
 * this are synchronous, and importing ROOT from blog.mjs would create a cycle.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const MESSAGES = {
  en: JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/en.json'), 'utf8')),
  ar: JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/ar.json'), 'utf8')),
};

const FACEBOOK_URL = 'https://www.facebook.com/qfzaa/';
const LINKEDIN_URL = 'https://www.linkedin.com/company/qfza';

// Copied from IconExternalLink in src/components/icons.tsx — the
// new-tab cue the React footer renders beside the social labels.
const ICON_EXTERNAL_LINK =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>';

// Copied from IconLinkedIn / IconFacebook in src/components/icons.tsx.
const ICON_LINKEDIN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13M7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0"/></svg>';
const ICON_FACEBOOK =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>';

/**
 * Footer CSS, scoped to `qlf-` to match the rest of the static renderers.
 *
 * Each rule is a hand translation of one Tailwind class string in
 * `SiteFooter.tsx`, which the comment above it names. Colours come from the
 * `@theme` tokens in `src/index.css`: `--color-action` (#1e3a8a) for
 * `text-primary`, `--color-action-hover` (#172d6e) for `hover:text-action-hover`.
 */
export const FOOTER_CSS = `
/* Mirrors .app in src/index.css: the homepage footer sits inside that
   container, so the static one needs the same 1200px measure or its rule
   and border-t span the whole viewport while the app's span 1152px.
   Padding mirrors .app's responsive gutter: 1rem on phones, 1.5rem at sm+. */
.qlf-site-footer{max-width:1200px;margin:0 auto;padding:0 1rem 3rem}
/* mt-16 border-t border-slate-200 bg-gradient-to-b from-transparent to-slate-50/50 pt-8 pb-4 text-center text-sm text-slate-500 animate-fade-in-up + style={{ animationDelay: '0.4s' }} */
.qlf-footer{margin-top:4rem;border-top:1px solid #e2e8f0;padding:2rem 0 1rem;background:linear-gradient(to bottom,transparent,rgb(248 250 252 / .5));color:#64748b;font-size:.875rem;line-height:1.25rem;text-align:center;animation:fade-in-up .6s ease-out;animation-delay:.4s}
/* line-height is 1.25rem because text-sm sets it: the app's body line-height
   is 1.6, so a font-size without a line-height renders 22.4px per line here
   against the app's 20px, and the footer comes out 6px taller. */
/* @keyframes fade-in-up, copied verbatim from src/index.css */
@keyframes fade-in-up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
/* font-medium text-slate-600 mb-2 */
.qlf-footer-note{margin:0 0 .5rem;color:#475569;font-weight:500}
/* mb-2 flex flex-wrap items-center justify-center gap-2 sm:gap-1 — a wider
   gap on phones keeps wrapped rows from crowding, dots are hidden there */
.qlf-footer-links{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.5rem;margin:0 0 .5rem;padding:0}
/* inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action */
.qlf-footer-links a{display:inline-flex;min-height:44px;align-items:center;gap:.375rem;border-radius:.375rem;padding:.375rem .625rem;color:#1e3a8a;font-size:.875rem;font-weight:600;text-decoration:none;transition:color .2s,background-color .2s}
.qlf-footer-links a:hover{background-color:#f1f5f9;color:#172d6e}
/* focus:outline-none focus-visible:ring-2 focus-visible:ring-action — ring-2 is a
   2px box-shadow in the ring colour, and focus-visible only draws it for
   keyboard users. Without this the static links get the browser's default
   outline while the app's do not. */
.qlf-footer-links a:focus{outline:none}
.qlf-footer-links a:focus-visible{outline:none;box-shadow:0 0 0 2px #1e3a8a}
/* The contact link is deliberately not one of the icon links: SiteFooter gives
   it inline-block with no min-h-11 and no gap, so it sits on the text line while
   the rest keep the 44px target. */
.qlf-footer-links a.qlf-footer-link-plain{display:inline-block;min-height:0}
.qlf-footer-links svg{width:1rem;height:1rem;flex:none}
/* the text-slate-300 separator between links — hidden sm:inline: a dot
   dangling at a wrap point reads as a stray mark on a narrow screen, so
   the separators only show once the row fits on one line */
.qlf-footer-dot{color:#cbd5e1;display:none}
/* sr-only, for the "opens in a new tab" hint on social links */
.qlf-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (min-width:640px){
  .qlf-footer-links{gap:.25rem}
  .qlf-footer-dot{display:inline}
  .qlf-site-footer{padding:0 1.5rem 3rem}
}
/* text-xs text-muted — --color-muted is #475569 (slate-600), not the inherited
   slate-500 the paragraph would otherwise take from .qlf-footer */
.qlf-footer-rights{margin:0;color:#475569;font-size:.75rem;line-height:1rem}
`;

/** @param locale current page locale, 'en' | 'ar' */
export function renderFooter(locale) {
  const t = MESSAGES[locale];
  const prefix = locale === 'ar' ? '/ar' : '';

  const dot = '<span class="qlf-footer-dot" aria-hidden="true">·</span>';

  return `<footer class="qlf-footer">
<p class="qlf-footer-note">${t.footer.note}</p>
<nav class="qlf-footer-links" aria-label="${t.footer.links}">
<a class="qlf-footer-link-plain" href="${prefix}/contact/">${t.footer.contact}</a>
${dot}
<a href="${prefix}/about/">${t.footer.about}</a>
${dot}
<a href="${prefix}/terms/">${t.footer.terms}</a>
${dot}
<a href="${prefix}/blog/">${t.footer.blog}</a>
${dot}
<a href="${prefix}/faq/">${t.footer.faq}</a>
${dot}
<a href="${prefix}/privacy/">${t.footer.privacy}</a>
${dot}
 <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer">${ICON_LINKEDIN}<span>${t.footer.linkedin}</span> ${ICON_EXTERNAL_LINK}<span class="qlf-sr-only">${t.footer.opensInNewTab}</span></a>
 ${dot}
 <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">${ICON_FACEBOOK}<span>${t.footer.facebook}</span> ${ICON_EXTERNAL_LINK}<span class="qlf-sr-only">${t.footer.opensInNewTab}</span></a>
</nav>
<p class="qlf-footer-rights">${t.footer.rights.replace('{{year}}', String(new Date().getFullYear()))}</p>
</footer>`;
}
