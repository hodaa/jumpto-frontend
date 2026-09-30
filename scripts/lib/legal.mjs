import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';

import { LOCALES, ROOT, parseFrontmatter, document_, esc } from './blog.mjs';
import { HEADER_CSS, renderHeader } from './header.mjs';

export { LOCALES, ROOT };
export const CONTENT_DIR = resolve(ROOT, 'content/legal');

/**
 * Legal pages are referenced by name rather than enumerated, so adding
 * `content/legal/<locale>/terms.md` is enough to get it built. Sitemap,
 * alternates and hreflang are all derived from the same slug set, which is
 * what keeps a new page from shipping in only one locale by accident.
 */
export async function loadPages(contentDir = CONTENT_DIR) {
  const pages = [];
  for (const locale of Object.keys(LOCALES)) {
    const dir = resolve(contentDir, locale);
    const files = await readdir(dir).catch(() => []);
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const raw = await readFile(resolve(dir, file), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      pages.push({
        ...data,
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
    // Arabic is the source language, matching the blog's x-default.
    '<link rel="alternate" hreflang="x-default" href="' +
      siteUrl +
      (page.locale === 'ar' ? page.url : twin.url) +
      '">',
  ].join('\n');
}

export function renderPage(page, { siteUrl, css, cssHref, twin }) {
  const meta = LOCALES[page.locale];
  const body = [
    renderHeader(page.locale, page.url),
    `<p class="qlf-post-eyebrow">${esc(page.updated)}</p>`,
    `<h1>${esc(page.title)}</h1>`,
    `<p class="qlf-post-meta">${esc(page.description)}</p>`,
    '<div class="qlf-body">',
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
    cssHref,
    ogType: 'website',
    // A policy page has no author or publish date, so it must not claim to be a
    // BlogPosting — that would be a false structured-data signal.
    jsonLd: '',
    headExtra: headExtra(page, twin, siteUrl),
    body,
  });
}

/**
 * Serve the same static legal pages during `vite dev` that build-legal.mjs emits
 * for production, so `/privacy/` and `/ar/privacy/` are previewable at their real
 * paths before a deploy. Without this, dev falls through to the SPA fallback and
 * the app renders instead of the policy, which makes the page look broken.
 * Registered ahead of Vite's SPA fallback.
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
          const pages = await loadPages(CONTENT_DIR);
          const locale = match[1] === 'ar' ? 'ar' : 'en';
          const page = pages.find((p) => p.slug === match[2] && p.locale === locale);
          // Not a legal page: hand it back so the SPA can handle it, rather than
          // swallowing every single-segment path.
          if (!page) return next();
          const twin = pages.find((p) => p.slug === page.slug && p.locale !== page.locale);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          // In dev the stylesheet is linked rather than inlined so HMR still applies.
          res.end(renderPage(page, { siteUrl, css: '', cssHref: '/src/index.css', twin }));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
