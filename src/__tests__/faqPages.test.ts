import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  loadAllPages,
  loadPages,
  renderPage,
  CONTENT_DIR,
  FAQ_CONTENT_DIR,
  PAGES_CONTENT_DIR,
  STATIC_SECTIONS,
} from '../../scripts/lib/legal.mjs';
import { LOCALES } from '../../scripts/lib/blog.mjs';

const dist = resolve(__dirname, '../../dist');
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

const faq = async () => loadPages(FAQ_CONTENT_DIR);
const twinOf = (list: Awaited<ReturnType<typeof faq>>, page: { slug: string; locale: string }) =>
  list.find((p) => p.slug === page.slug && p.locale !== page.locale);

describe('FAQ content', () => {
  it('ships a FAQ in every locale', async () => {
    const list = await faq();
    for (const locale of Object.keys(LOCALES)) {
      expect(list.some((p) => p.locale === locale && p.slug === 'faq')).toBe(true);
    }
  });

  it('gives the page a title and a description, and no date', async () => {
    for (const page of await faq()) {
      expect(page.title, `${page.locale} title`).toBeTruthy();
      expect(page.description, `${page.locale} description`).toBeTruthy();
      // Deliberately undated. `updated` renders an eyebrow above the title and
      // becomes the sitemap's <lastmod>; on evergreen reference content it was
      // only ever the authoring date, frozen into a field that claims "changed
      // on". A stale-but-present lastmod is worse than none, because crawlers
      // are told to trust it. About and FAQ are undated for the same reason;
      // Terms and Privacy keep a real revision date.
      expect(page.updated, `${page.locale} updated`).toBeUndefined();
    }
  });

  it('answers the same questions in every locale', async () => {
    // An FAQ that answers a question in English and not in Arabic is worse than
    // a missing one, because the Arabic page looks complete.
    const list = await faq();
    const en = list.find((p) => p.locale === 'en')!;
    const ar = list.find((p) => p.locale === 'ar')!;
    const headings = (html: string) =>
      [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
    const count = (html: string) => headings(html).length;
    expect(count(en.html)).toBeGreaterThan(5);
    expect(count(ar.html)).toBe(count(en.html));
  });

  it('points at the policy rather than restating what it says', async () => {
    // The privacy page is the single source of truth and is still awaiting
    // owner sign-off. A second copy here would drift from it silently.
    const list = await faq();
    for (const page of list) {
      const policy = page.locale === 'en' ? '/privacy/' : '/ar/privacy/';
      expect(page.html, `${page.locale} links to the policy`).toContain(`href="${policy}"`);
    }
  });

  it('links only to pages that exist, or to an app route', async () => {
    // A dead internal link on a page with no JS to route it is a dead end: the
    // visitor has nothing to click back to.
    const list = await faq();
    for (const page of list) {
      for (const [, href] of page.html.matchAll(/href="(\/[^"]*)"/g)) {
        const isAppRoute = href.startsWith('/#');
        const target = resolve(dist, href.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
        expect(
          isAppRoute || existsSync(target),
          `${page.locale} FAQ links to missing page ${href}`,
        ).toBe(true);
      }
    }
  });
});

describe('FAQ rendering', () => {
  it('emits reciprocal hreflang and an x-default pointing at English', async () => {
    const list = await faq();
    const page = list.find((p) => p.locale === 'en')!;
    const html = renderPage(page, {
      siteUrl: 'https://qfza.app',
      css: '',
      twin: twinOf(list, page),
    });
    expect(html).toContain('<link rel="alternate" hreflang="ar" href="https://qfza.app/ar/faq/">');
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://qfza.app/faq/">');
    expect(html).toContain('hreflang="x-default" href="https://qfza.app/faq/"');
  });

  it('sets lang and dir from the locale, not from the page content', async () => {
    const list = await faq();
    const ar = list.find((p) => p.locale === 'ar')!;
    const html = renderPage(ar, {
      siteUrl: 'https://qfza.app',
      css: '',
      twin: twinOf(list, ar),
    });
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
  });

  it('is a website, not a post, and claims no authorship', async () => {
    // The FAQ is neither a legal document nor a BlogPosting; emitting either
    // would be a false structured-data signal.
    const list = await faq();
    const page = list.find((p) => p.locale === 'en')!;
    const html = renderPage(page, {
      siteUrl: 'https://qfza.app',
      css: '',
      twin: twinOf(list, page),
    });
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).not.toContain('BlogPosting');
  });

  it('shows no date eyebrow above the title', async () => {
    const list = await faq();
    const page = list.find((p) => p.locale === 'en')!;
    const html = renderPage(page, {
      siteUrl: 'https://qfza.app',
      css: '',
      twin: twinOf(list, page),
    });
    // The element, not the bare class name — the document's own <style> block
    // still defines `.qlf-post-eyebrow` for the pages that do carry a date.
    expect(page.updated).toBeUndefined();
    expect(html).not.toContain('<p class="qlf-post-eyebrow">');
    expect(html).toContain(`<h1>${page.title}</h1>`);
  });

  it('omits the eyebrow entirely when a page carries no date', () => {
    // These pages are added by name, not from a manifest, so `updated` is easy
    // to forget. Without this guard esc(undefined) renders the literal string
    // "undefined" above the title. Matched on the element, not the bare class:
    // the .qlf-post-eyebrow CSS rule is inlined into every page regardless.
    const html = renderPage(
      { title: 'No date', description: 'd', locale: 'en', slug: 'x', url: '/x/', html: '' },
      { siteUrl: 'https://qfza.app', css: '' },
    );
    expect(html).not.toContain('<p class="qlf-post-eyebrow">');
    expect(html).not.toContain('undefined');
  });
});

describe('the FAQ is its own section, not a policy', () => {
  it('keeps content/faq separate from content/legal and content/pages', () => {
    // loadPages is scoped to one directory, so a page dropped into the wrong one
    // builds with the wrong sitemap priority rather than failing loudly.
    expect(FAQ_CONTENT_DIR).not.toBe(CONTENT_DIR);
    expect(FAQ_CONTENT_DIR).not.toBe(PAGES_CONTENT_DIR);
    expect(STATIC_SECTIONS.map((s) => s.dir)).toEqual([
      CONTENT_DIR,
      FAQ_CONTENT_DIR,
      PAGES_CONTENT_DIR,
    ]);
  });

  it('tags every page with the section it came from', async () => {
    const all = await loadAllPages();
    expect(all.filter((p) => p.section === 'faq')).toHaveLength(Object.keys(LOCALES).length);
    // The policies must still be discoverable through the whole-site view, or
    // the dev server stops serving /privacy/.
    expect(all.some((p) => p.section === 'legal' && p.slug === 'privacy')).toBe(true);
  });

  it('does not let the FAQ leak into the legal-only loader', async () => {
    const legal = await loadPages(CONTENT_DIR);
    expect(legal.some((p) => p.slug === 'faq')).toBe(false);
  });
});

describe('built FAQ pages', () => {
  const built = existsSync(resolve(dist, 'faq/index.html'));
  it.runIf(built)('writes both FAQ pages', () => {
    expect(existsSync(resolve(dist, 'faq/index.html'))).toBe(true);
    expect(existsSync(resolve(dist, 'ar/faq/index.html'))).toBe(true);
  });

  it.runIf(built)('ships only the FAQ accordion script, so it works with JS disabled', () => {
    for (const p of ['faq/index.html', 'ar/faq/index.html']) {
      const html = read(`../../dist/${p}`);
      // Only the FAQ accordion progressive-enhancement script is allowed.
      // The page must still work with JS disabled (all answers visible).
      const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
      expect(scripts.length, `${p} should have exactly one script (accordion)`).toBe(1);
      expect(scripts[0]).toContain('faq-accordion');
      expect(scripts[0]).not.toContain('main.tsx');
      expect(scripts[0]).not.toContain('module');
    }
  });

  it.runIf(built)('carries the site footer, so the FAQ is reachable both ways', () => {
    for (const p of ['faq/index.html', 'ar/faq/index.html']) {
      const html = read(`../../dist/${p}`);
      expect(html).toContain('<footer class="qlf-footer">');
      expect(html).toContain('qlf-footer-links');
    }
    expect(read('../../dist/faq/index.html')).toContain('href="/privacy/"');
    expect(read('../../dist/privacy/index.html')).toContain('href="/faq/"');
  });

  it.runIf(built)('ranks the FAQ as content and the policies as legal', () => {
    // The whole reason the FAQ is not filed under content/legal: burying it at
    // priority 0.3 and a yearly changefreq would misdescribe it.
    const sitemap = read('../../dist/sitemap.xml');
    const blocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    const blockFor = (needle: string) => blocks.find((b) => b.includes(needle));

    for (const path of ['/faq/', '/ar/faq/']) {
      const block = blockFor(`qfza.app${path}</loc>`);
      expect(block, `no sitemap block for ${path}`).toBeTruthy();
      expect(block).toMatch(/<changefreq>monthly<\/changefreq>/);
      expect(block).toMatch(/<priority>0\.7<\/priority>/);
      // No <lastmod>: the FAQ is undated, and an invented one would be a signal
      // crawlers are entitled to trust.
      expect(block).not.toMatch(/<lastmod>/);
    }
    for (const path of ['/privacy/', '/ar/privacy/']) {
      const block = blockFor(`qfza.app${path}</loc>`);
      expect(block).toMatch(/<changefreq>yearly<\/changefreq>/);
      expect(block).toMatch(/<priority>0\.3<\/priority>/);
    }
  });

  it.runIf(built)('sends the built pages to the deployed origin', () => {
    for (const p of ['faq/index.html', 'ar/faq/index.html']) {
      expect(read(`../../dist/${p}`)).toContain('rel="canonical" href="https://qfza.app');
    }
  });
});
