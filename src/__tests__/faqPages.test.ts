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

describe('FAQ structured data', () => {
  /**
   * Pages carrying their `section`, which is what `renderPage` keys off.
   *
   * `loadPages` returns the bare page without it, so calling that here renders a
   * page the build would never produce and the FAQ schema silently never appears —
   * which is exactly the shape of a false pass.
   */
  const faqPages = async () => (await loadAllPages()).filter((p) => p.section === 'faq');

  const render = async (page: Parameters<typeof renderPage>[0]) => {
    const list = await faqPages();
    return renderPage(page, {
      siteUrl: 'https://qfza.app',
      css: '',
      twin: twinOf(list, page),
    });
  };

  const jsonLdOf = (html: string) =>
    JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');

  it('declares the page as FAQPage in both locales', async () => {
    // The FAQ is the one section written as question-and-answer, and the sitemap
    // ranks it above every other content page because it answers things people
    // search for. FAQPage is the schema that describes exactly that shape.
    for (const page of await faqPages()) {
      const ld = jsonLdOf(await render(page));
      expect(ld, `${page.locale} has no structured data`).toBeTruthy();
      expect(ld['@type']).toBe('FAQPage');
      expect(ld.inLanguage).toBe(page.locale);
      expect(ld.url).toBe(`https://qfza.app${page.url}`);
    }
  });

  it('turns every question heading into a complete Question', async () => {
    // One entity per `##`, so the structured data cannot claim fewer questions than
    // the page answers. A heading with no body under it is a section label rather
    // than a question, so if one is ever added this fails rather than emitting an
    // empty acceptedAnswer — a claim that the page answers a question it does not.
    for (const page of await faqPages()) {
      const headings = [...page.html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
      const ld = jsonLdOf(await render(page));
      expect(ld.mainEntity.length, `${page.locale} question count`).toBe(headings.length);
      for (const [i, entity] of ld.mainEntity.entries()) {
        expect(entity['@type']).toBe('Question');
        expect(entity.name, `${page.locale} question ${i} is empty`).toBeTruthy();
        expect(entity.acceptedAnswer['@type']).toBe('Answer');
        expect(entity.acceptedAnswer.text, `${page.locale} answer ${i} is empty`).toBeTruthy();
      }
    }
  });

  it('answers in plain text, with no markup or leftover entities', async () => {
    // acceptedAnswer.text is plain text. Raw HTML would be read as markup by the
    // consumer, and an undecoded entity is a visible defect in a search snippet.
    for (const page of await faqPages()) {
      for (const entity of jsonLdOf(await render(page)).mainEntity) {
        const text: string = entity.acceptedAnswer.text;
        expect(text, `${page.locale} answer carries markup`).not.toMatch(/[<>]/);
        expect(text, `${page.locale} answer carries a raw entity`).not.toMatch(/&(amp|lt|gt|quot|nbsp|#39);/);
      }
    }
  });

  it('never attaches the intro paragraph to the first answer', async () => {
    // The copy above the first `##` is page framing. Folding it into the first
    // answer states something the page does not, in the one place a search
    // snippet is most likely to be read. Checked structurally — which slice of the
    // source became the answer — rather than by looking for shared vocabulary,
    // which would flag any topical word the intro and the answer legitimately share.
    const flatten = (html: string) =>
      html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

    for (const page of await faqPages()) {
      const firstHeading = page.html.search(/<h2/);
      expect(firstHeading, `${page.locale} has no questions`).toBeGreaterThan(-1);
      const intro = flatten(page.html.slice(0, firstHeading));

      // Everything between the end of the first heading and the next one.
      const afterFirst = page.html.split('</h2>')[1] ?? '';
      const nextHeading = afterFirst.search(/<h2/);
      const firstSection = flatten(
        nextHeading === -1 ? afterFirst : afterFirst.slice(0, nextHeading),
      );

      const firstAnswer: string = jsonLdOf(await render(page)).mainEntity[0].acceptedAnswer.text;
      expect(firstAnswer, `${page.locale} first answer is not the first section`).toBe(
        firstSection,
      );
      // Vacuous when a locale has no intro, which is the case for the Arabic FAQ
      // today. That asymmetry is a content gap, not a rendering one — the build
      // does not invent an intro, so there is nothing here to misplace.
      expect(
        intro !== '' && firstAnswer.startsWith(intro),
        `${page.locale} first answer was prefixed with the intro`,
      ).toBe(false);
    }
  });

  it('claims no authorship or publish date, which a policy page cannot support', async () => {
    const legal = await loadPages(CONTENT_DIR);
    for (const page of legal) {
      const html = renderPage(
        { ...page, section: 'legal' },
        { siteUrl: 'https://qfza.app', css: '' },
      );
      // Only the FAQ earns schema. A policy carrying FAQPage or BlogPosting would be
      // a false structured-data signal, which is worse than no signal at all.
      expect(html, `${page.locale}/${page.slug} should carry no structured data`).not.toContain(
        'ld+json',
      );
    }
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
      // Only the FAQ accordion progressive-enhancement script may be executable.
      // `application/ld+json` is data the browser never runs, so it is excluded
      // rather than counted — the page must still work with JS disabled (all
      // answers visible), and that is what this assertion is protecting.
      const executable = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
        ([, attrs]) => !/application\/ld\+json/i.test(attrs),
      );
      expect(executable.length, `${p} should have exactly one executable script`).toBe(1);
      expect(executable[0][2]).toContain('faq-accordion');
      expect(executable[0][2]).not.toContain('main.tsx');
      expect(executable[0][2]).not.toContain('module');
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
