import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadAllPages, renderPage, ROOT } from './lib/legal.mjs';
import { resolveSiteUrl } from './lib/site-url.mjs';

const dist = resolve(ROOT, 'dist');

const siteUrl = resolveSiteUrl();

const indexHtml = await readFile(resolve(dist, 'index.html'), 'utf8');

// Reuse the app's inlined Tailwind, exactly like build-blog.mjs. Prefer the
// largest <style> so the small prerender shell's scoped block is skipped.
function extractAppCss(html) {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  if (!blocks.length) {
    throw new Error('[legal] no <style> found in dist/index.html — did vite build run first?');
  }
  return blocks.sort((a, b) => b.length - a.length)[0];
}

/**
 * Sitemap treatment per section, decided here rather than in prerender.mjs
 * because only this module knows what a page *is*.
 *
 * A policy is a legal document: it ranks for nobody and changes maybe once a
 * year. An FAQ is the opposite — it is written to answer questions people
 * actually search for, so burying it at priority 0.3 would be wrong. Ordinary
 * pages sit in between and carry no strong signal, so the section default is
 * deliberately modest; a page overrides it in frontmatter when it deserves more
 * (About) or less (Terms, which is legal in substance even though it lives under
 * `pages` for build reasons).
 */
const SITEMAP = {
  legal: { changefreq: 'yearly', priority: '0.3' },
  faq: { changefreq: 'monthly', priority: '0.7' },
  pages: { changefreq: 'monthly', priority: '0.6' },
};

const pages = await loadAllPages();
if (!pages.length) {
  console.log('[legal] no static pages found — skipping');
  process.exit(0);
}

const css = extractAppCss(indexHtml);
let written = 0;

for (const page of pages) {
  // A twin is the same slug in the other locale; hreflang needs both, and a
  // one-locale page must not ship a half-formed alternate cluster.
  const twin = pages.find((p) => p.slug === page.slug && p.locale !== page.locale);
  if (!twin) {
    throw new Error(
      `[legal] ${page.section}/${page.slug}.md has no ${page.locale === 'en' ? 'ar' : 'en'} counterpart — ` +
        `${page.section} pages must exist in both locales`,
    );
  }

  const dir = resolve(dist, page.url.replace(/^\//, '').replace(/\/$/, ''));
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, 'index.html'),
    renderPage(page, { siteUrl, css, twin }),
  );
  written += 1;
}

console.log(`[legal] wrote ${written} static page(s) at ${siteUrl}`);

// prerender.mjs runs next and needs the url -> date map for the sitemap's
// <lastmod>, the same handoff build-blog.mjs makes. `alternates` rides along so
// the sitemap can emit xhtml:link hreflang for the locale pair; only the builder
// knows which slug pairs with which, so it is resolved here rather than guessed
// downstream from URL strings.
await writeFile(
  resolve(dist, 'legal-manifest.json'),
  `${JSON.stringify(
    pages.map((p) => {
      const twin = pages.find((o) => o.slug === p.slug && o.locale !== p.locale);
      // English is the primary SEO target, so x-default resolves to the English
      // URL whichever locale we are emitting. With no twin yet, fall back to self.
      const xDefault = p.locale === 'en' ? p : (twin ?? p);
      const defaults = SITEMAP[p.section] ?? SITEMAP.pages;
      return {
        url: p.url,
        section: p.section,
        // Frontmatter wins over the section default, so one section can hold a
        // page that changes weekly and a page that changes yearly. Read as
        // strings because that is how YAML frontmatter arrives and how the
        // sitemap emits them.
        changefreq: p.changefreq ?? defaults.changefreq,
        priority: p.priority ?? defaults.priority,
        lastmod: p.updated || null,
        // Contact ships as a real document and is also a client route, so it
        // carries the flag prerender.mjs uses to mount the app over the
        // generated copy. Absent for every other page, which stay script-free.
        ...(p.hydrate ? { hydrate: true } : {}),
        alternates: [
          { hreflang: p.locale, href: `${siteUrl}${p.url}` },
          ...(twin ? [{ hreflang: twin.locale, href: `${siteUrl}${twin.url}` }] : []),
          { hreflang: 'x-default', href: `${siteUrl}${xDefault.url}` },
        ],
      };
    }),
    null,
    2,
  )}\n`,
);
