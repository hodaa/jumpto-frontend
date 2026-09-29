import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadPages, renderPage, ROOT, CONTENT_DIR } from './lib/legal.mjs';
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

const pages = await loadPages(CONTENT_DIR);
if (!pages.length) {
  console.log('[legal] no legal pages found — skipping');
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
      `[legal] ${page.slug}.md has no ${page.locale === 'en' ? 'ar' : 'en'} counterpart — ` +
        'legal pages must exist in both locales',
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
      // Arabic is the source language, so x-default resolves to the Arabic URL
      // whichever locale we are emitting. With no twin yet, fall back to self.
      const xDefault = p.locale === 'ar' ? p : (twin ?? p);
      return {
        url: p.url,
        lastmod: p.updated || null,
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
