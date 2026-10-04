import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';

import { LOCALES, ROOT, parseFrontmatter, document_, esc } from './blog.mjs';
import { HEADER_CSS, renderHeader } from './header.mjs';

export { LOCALES, ROOT };
export const CONTENT_DIR = resolve(ROOT, 'content/legal');
/**
 * The FAQ lives in its own directory rather than beside the policies, because it
 * is neither: it is support content that changes often and ranks for questions,
 * and a page that answers "why did my search fail" is not a legal document.
 * Splitting it out keeps `content/legal` meaning one thing, and lets the sitemap
 * give the two sections different priorities — see `sitemapEntry` in
 * prerender.mjs.
 */
export const FAQ_CONTENT_DIR = resolve(ROOT, 'content/faq');

/**
 * Ordinary content pages: About, Terms and Contact.
 *
 * A third directory rather than more sections, because these three have nothing
 * in common with each other beyond being neither a policy nor a FAQ. One section
 * also means one entry in `STATIC_SECTIONS` instead of three near-identical ones.
 * Contact lives here because it is a real generated document — crawlable copy with
 * its own title, description and canonical — that the app then mounts a live form
 * over. That is why it is a file and not a hash route.
 */
export const PAGES_CONTENT_DIR = resolve(ROOT, 'content/pages');

/** Every non-blog static page section, in the order the build walks them. */
export const STATIC_SECTIONS = [
  { section: 'legal', dir: CONTENT_DIR },
  { section: 'faq', dir: FAQ_CONTENT_DIR },
  { section: 'pages', dir: PAGES_CONTENT_DIR },
];

/**
 * Static pages are referenced by name rather than enumerated, so adding
 * `content/legal/<locale>/terms.md` is enough to get it built. Sitemap,
 * alternates and hreflang are all derived from the same slug set, which is
 * what keeps a new page from shipping in only one locale by accident.
 *
 * `loadAllPages` is the whole-site view the build and the dev server use;
 * `loadPages` stays scoped to one section for callers that want just that one.
 */
export async function loadAllPages() {
  const bySection = await Promise.all(
    STATIC_SECTIONS.map(async ({ section, dir }) =>
      (await loadPages(dir)).map((page) => ({ ...page, section })),
    ),
  );
  return bySection.flat();
}

export async function loadPages(contentDir = CONTENT_DIR) {
  const pages = [];
  for (const locale of Object.keys(LOCALES)) {
    const dir = resolve(contentDir, locale);
    const files = await readdir(dir).catch(() => []);
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const raw = await readFile(resolve(dir, file), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      // `parseFrontmatter` hands back plain text, so YAML's `hydrate: true`
      // arrives as the string 'true'. Coerce it once here: the alternative is
      // every caller writing its own truthiness test, and a caller that forgets
      // produces a page that ships the app's script with no #root for it to
      // mount into — a blank page that no assertion would have caught.
      const hydrate = data.hydrate === true || data.hydrate === 'true';
      pages.push({
        ...data,
        ...(data.hydrate === undefined ? {} : { hydrate }),
        locale,
        slug: file.replace(/\.md$/, ''),
        url: `${LOCALES[locale].prefix}/${file.replace(/\.md$/, '')}/`,
        html: marked.parse(body),
      });
    }
  }
  return pages;
}

/** Reciprocal hreflang for a same-slug page in the other locale. */
function headExtra(page, twin, siteUrl) {
  if (!twin) return '';
  return [
    `<link rel="alternate" hreflang="${twin.locale}" href="${siteUrl + twin.url}">`,
    `<link rel="alternate" hreflang="${page.locale}" href="${siteUrl + page.url}">`,
    // English is the primary SEO target, matching the blog's x-default.
    '<link rel="alternate" hreflang="x-default" href="' +
      siteUrl +
      (page.locale === 'en' ? page.url : twin.url) +
      '">',
  ].join('\n');
}

/**
 * FAQ questions are headings (`##` in the markdown), so they arrive as `h2` and
 * would otherwise be navy like every other section heading on the site.
 *
 * Scoped to `.qlf-faq` rather than changing the shared `.qlf-body h2` rule: the
 * same class styles About, Terms and Privacy, and their `##` headings are prose
 * structure, not questions. The doubled class is also what lets this win over
 * `.qlf-body h2` regardless of stylesheet order — dev and build emit the shared
 * rules in different positions, so relying on source order would style the page
 * in one and not the other.
 *
 * `--color-accent` is the bright brand orange. An `h2` here renders at 24px, which
 * meets the WCAG "large text" threshold (18pt) on size alone, so the 3:1 ratio
 * applies and this orange clears it on white; body copy would need the darker
 * `--color-accent-strong` instead.
 */
const FAQ_CSS = `
.qlf-body.qlf-faq h2{color:var(--color-accent)}
`;

export function renderPage(page, { siteUrl, css, cssHref, twin }) {
  const meta = LOCALES[page.locale];
  const header = renderHeader(page.locale, page.url);
  const isFaq = page.section === 'faq';
  // A hydrated page (Contact) is a document for crawlers and no-JS readers, but
  // the app replaces its body with a live form. Post chrome is wrong twice over:
  // a bare `updated` date floating above "Contact us" in the HTML that actually
  // ships, and a standfirst the app throws away on hydration in favour of its
  // own. `updated` stays in the frontmatter either way — the sitemap still reads
  // its <lastmod> from there — this only decides what gets rendered.
  const isHydrated = page.hydrate === true;
  const body = [
    // `updated` is optional because these pages are added by name, not by a
    // manifest: without this guard a page that omits it renders the literal
    // string "undefined" above its title. A page with no date simply has no
    // eyebrow, and ships without a <lastmod> in the sitemap.
    !isHydrated && page.updated ? `<p class="qlf-post-eyebrow">${esc(page.updated)}</p>` : '',
    `<h1>${esc(page.title)}</h1>`,
    isHydrated ? '' : `<p class="qlf-post-meta">${esc(page.description)}</p>`,
    `<div class="qlf-body${isFaq ? ' qlf-faq' : ''}">`,
    page.html,
    '</div>',
  ].join('\n  ');

  return document_({
    siteUrl,
    url: page.url,
    title: page.title,
    description: page.description,
    locale: page.locale,
    dir: meta.dir,
    css,
    header,
    cssHref,
    ogType: 'website',
    // A policy page has no author or publish date, so it must not claim to be a
    // BlogPosting — that would be a false structured-data signal.
    jsonLd: '',
    headExtra: headExtra(page, twin, siteUrl),
    extraCss: isFaq ? FAQ_CSS : '',
    body,
    // Contact asks to be a mount point for the app; see `document_`'s hydrate.
    // Every other page leaves this false and stays free of script tags.
    hydrate: page.hydrate === true,
  });
}

/**
 * Serve the same static pages during `vite dev` that build-legal.mjs emits for
 * production, so `/privacy/`, `/faq/` and their Arabic counterparts are
 * previewable at their real paths before a deploy. Without this, dev falls
 * through to the SPA fallback and the app renders instead of the page, which
 * makes it look broken. Registered ahead of Vite's SPA fallback.
 *
 * Named for the legal section it was born from; it now serves every section in
 * STATIC_SECTIONS, so renaming it would churn the Vite config and the tests for
 * no behaviour change.
 */
export function legalDevPlugin(siteUrl) {
  return {
    name: 'qfza-legal-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const match = /^\/(?:(ar)\/)?([a-z0-9-]+)\/?$/.exec(url);
        if (!match) return next();
        try {
          const pages = await loadAllPages();
          const locale = match[1] === 'ar' ? 'ar' : 'en';
          const page = pages.find((p) => p.slug === match[2] && p.locale === locale);
          // Not a static page: hand it back so the SPA can handle it, rather than
          // swallowing every single-segment path.
          if (!page) return next();
          const twin = pages.find((p) => p.slug === page.slug && p.locale !== page.locale);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          // In dev the stylesheet is linked rather than inlined so HMR still applies.
          const html = renderPage(page, { siteUrl, css: '', cssHref: '/src/index.css', twin });
          // A hydrated page is a document *and* a client route: the markdown ships
          // for crawlers and readers without JS, then React replaces it with the
          // live view. Production gets the built entry script from
          // `scripts/prerender.mjs`, which only runs during a build — so dev has to
          // inject its own or `/contact/` renders as static prose with no form at
          // all, and the form can only be worked on in a built preview.
          const withEntry = page.hydrate
            ? html.replace(
                '</body>',
                '  <script type="module" src="/src/main.tsx"></script>\n</body>',
              )
            : html;
          // Through Vite's HTML transform, because this string bypasses
          // `index.html`. That transform is what injects the React Fast Refresh
          // preamble; without it every `.tsx` module throws "can't detect
          // preamble" and the page silently stays static with no console error
          // from the app itself.
          res.end(await server.transformIndexHtml(url, withEntry));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
