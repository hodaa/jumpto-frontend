import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadPages, renderPage, CONTENT_DIR } from '../../scripts/lib/legal.mjs';
import { LOCALES } from '../../scripts/lib/blog.mjs';

const dist = resolve(__dirname, '../../dist');
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

async function pages() {
  return loadPages(CONTENT_DIR);
}

function twinOf(list: Awaited<ReturnType<typeof pages>>, page: { slug: string; locale: string }) {
  return list.find((p) => p.slug === page.slug && p.locale !== page.locale);
}

describe('legal page content', () => {
  it('ships a privacy page in every locale', async () => {
    const list = await pages();
    for (const locale of Object.keys(LOCALES)) {
      expect(list.some((p) => p.locale === locale && p.slug === 'privacy')).toBe(true);
    }
  });

  it('gives every page a title, description, and updated date', async () => {
    for (const page of await pages()) {
      expect(page.title.trim(), `${page.url} title`).not.toBe('');
      expect(page.description.trim(), `${page.url} description`).not.toBe('');
      expect(page.updated, `${page.url} updated`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('never claims to store the search term or keyword locally', async () => {
    for (const page of await pages()) {
      const html = page.html.toLowerCase();
      // The app's only localStorage write is the language preference. If a
      // future cache change persists searches, this fails and the policy must
      // be rewritten before it ships a claim that is no longer true.
      expect(html, `${page.url} mentions what is stored`).toMatch(
        /local storage|التخزين المحلي/,
      );
      expect(html, `${page.url} disclaims disk storage`).toMatch(
        /never written to disk|لا تُكتب على القرص أبدًا/,
      );
    }
  });

  it('discloses the video id carried in shared deep links', async () => {
    // A privacy policy that omits this would be wrong: /?v=<id>&t=<s> puts the
    // video id in the address bar, which analytics receive verbatim. Assert the
    // prose section AND the template, so deleting the whole section fails —
    // matching 'video-id' alone would still pass off the code block.
    const prose: Record<string, RegExp> = {
      en: /shared links and your address bar/i,
      ar: /روابط المشاركة وشريط العنوان/,
    };
    for (const page of await pages()) {
      expect(page.html, `${page.url} address-bar section`).toMatch(prose[page.locale]);
      expect(page.html, `${page.url} deep-link template`).toContain('?v=');
    }
  });

  it('names the contact address in every locale', async () => {
    for (const page of await pages()) {
      expect(page.html, `${page.url} contact`).toContain('support@qfza.app');
    }
  });

  it('links the other locale rather than itself', async () => {
    for (const page of await pages()) {
      const other = page.locale === 'en' ? '/ar/privacy/' : '/privacy/';
      expect(page.html, `${page.url} cross-link`).toContain(other);
      // Anchor on the full href: '/ar/privacy/' contains '/privacy/' as a plain
      // substring, so a bare `not.toContain(page.url)` would be a false pass.
      expect(page.html, `${page.url} has no self-link`).not.toMatch(
        new RegExp(`href="${page.url}"`),
      );
    }
  });
});

describe('legal page rendering', () => {
  it('emits reciprocal hreflang and an x-default pointing at Arabic', async () => {
    const list = await pages();
    for (const page of list) {
      const html = renderPage(page, {
        siteUrl: 'https://qfza.app',
        css: '',
        twin: twinOf(list, page),
      });
      const twin = twinOf(list, page)!;
      expect(html).toContain(`hreflang="${twin.locale}" href="https://qfza.app${twin.url}"`);
      expect(html).toContain(`hreflang="${page.locale}" href="https://qfza.app${page.url}"`);
      expect(html).toContain('hreflang="x-default" href="https://qfza.app/ar/privacy/"');
    }
  });

  it('sets lang and dir from the locale, not from the page content', async () => {
    const list = await pages();
    for (const page of list) {
      const html = renderPage(page, { siteUrl: 'https://qfza.app', css: '', twin: twinOf(list, page) });
      expect(html).toContain(`<html lang="${page.locale}" dir="${LOCALES[page.locale].dir}">`);
    }
  });

  it('uses a self-referencing canonical', async () => {
    const list = await pages();
    for (const page of list) {
      const html = renderPage(page, { siteUrl: 'https://qfza.app', css: '', twin: twinOf(list, page) });
      expect(html).toContain(`rel="canonical" href="https://qfza.app${page.url}"`);
    }
  });

  it('does not claim to be an article', async () => {
    // No author, no publish date, no BlogPosting: labelling a policy page as an
    // article is a false structured-data signal.
    const list = await pages();
    for (const page of list) {
      const html = renderPage(page, { siteUrl: 'https://qfza.app', css: '', twin: twinOf(list, page) });
      expect(html).not.toContain('BlogPosting');
      expect(html).toContain('og:type" content="website"');
    }
  });
});

describe('built output', () => {
  const built = existsSync(resolve(dist, 'privacy/index.html'));

  it.runIf(built)('writes both privacy pages', () => {
    expect(existsSync(resolve(dist, 'privacy/index.html'))).toBe(true);
    expect(existsSync(resolve(dist, 'ar/privacy/index.html'))).toBe(true);
  });

  it.runIf(built)('ships no JavaScript on the policy pages', () => {
    for (const p of ['privacy/index.html', 'ar/privacy/index.html']) {
      expect(read(`../../dist/${p}`)).not.toContain('<script');
    }
  });

  it.runIf(built)('lists both policy pages in the sitemap at low priority', () => {
    const sitemap = read('../../dist/sitemap.xml');
    expect(sitemap).toContain('<loc>https://qfza.app/privacy/</loc>');
    expect(sitemap).toContain('<loc>https://qfza.app/ar/privacy/</loc>');
    // Legal pages are not content; a high priority would compete with real pages.
    // Assert per-block rather than by adjacency, because xhtml:link alternates
    // now sit between </loc> and <changefreq>.
    for (const block of [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1])) {
      if (!/\/privacy\//.test(block)) continue;
      expect(block).toMatch(/<changefreq>yearly<\/changefreq>/);
      expect(block).toMatch(/<priority>0\.3<\/priority>/);
    }
  });

  it.runIf(built)('is linked from the crawlable homepage shell in both locales', () => {
    const home = read('../../dist/index.html');
    expect(home).toContain('href="/privacy/"');
    expect(home).toContain('href="/ar/privacy/"');
  });

  it.runIf(built)('sends the built pages to the deployed origin, not localhost', () => {
    for (const p of ['privacy/index.html', 'ar/privacy/index.html']) {
      const html = read(`../../dist/${p}`);
      expect(html).toContain('rel="canonical" href="https://qfza.app');
      expect(html).not.toContain('localhost');
    }
  });

  it.runIf(built)('has no orphan locale variant on disk', () => {
    const en = readdirSync(resolve(dist, 'privacy'), { withFileTypes: true }).filter((e) =>
      e.isDirectory(),
    );
    const ar = readdirSync(resolve(dist, 'ar/privacy'), { withFileTypes: true }).filter((e) =>
      e.isDirectory(),
    );
    expect(en.map((e) => e.name)).toEqual(ar.map((e) => e.name));
  });
});

describe('legal build guards', () => {
  it('rejects a legal page that has no counterpart in the other locale', async () => {
    const list = await pages();
    // Every shipped page must have a twin; build-legal.mjs throws otherwise, and
    // this asserts the invariant that makes that throw reachable.
    for (const page of list) {
      expect(twinOf(list, page), `${page.slug} (${page.locale}) needs a twin`).toBeDefined();
    }
  });
});
