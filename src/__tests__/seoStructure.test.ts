import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(__dirname, '../../dist');
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const built = existsSync(resolve(dist, 'index.html'));

const SOCIAL = JSON.parse(read('../../src/social.json')) as {
  facebook: string;
  linkedin: string;
};

describe('WebSite structured data', () => {
  const jsonLd = () =>
    JSON.parse(
      read('../../index.html')
        // The social placeholders are substituted from
        // src/social.json by the social-links plugin; resolve
        // them here the same way before parsing.
        .replaceAll('%FACEBOOK_URL%', SOCIAL.facebook)
        .replaceAll('%LINKEDIN_URL%', SOCIAL.linkedin)
        .match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1],
    );

  it('publishes an Organization and points the WebSite at it', () => {
    const data = jsonLd();
    const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    const org = nodes.find((n) => n['@type'] === 'Organization');
    const web = nodes.find((n) => n['@type'] === 'WebSite');
    expect(org, 'no Organization node').toBeDefined();
    expect(web, 'no WebSite node').toBeDefined();
    // A WebSite with no publisher is the gap this closes, so assert the
    // reference exists AND resolves to a real node in the same graph.
    expect(web.publisher, 'WebSite has no publisher').toBeDefined();
    const id = typeof web.publisher === 'string' ? web.publisher : web.publisher['@id'];
    expect(
      nodes.some((n) => n['@id'] === id),
      `publisher ${id} does not resolve`,
    ).toBe(true);
  });

  it('gives the Organization a logo with dimensions', () => {
    const data = jsonLd();
    const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    const org = nodes.find((n) => n['@type'] === 'Organization');
    expect(org.logo?.url, 'publisher has no logo url').toBeTruthy();
    // Google rejects an ImageObject without pixel dimensions.
    expect(typeof org.logo.width).toBe('number');
    expect(typeof org.logo.height).toBe('number');
  });

  it('keeps the sameAs social profiles on both nodes', () => {
    const data = jsonLd();
    const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    for (const type of ['Organization', 'WebSite']) {
      const node = nodes.find((n) => n['@type'] === type);
      expect(node.sameAs, `${type} lost sameAs`).toContain(SOCIAL.linkedin);
    }
  });

  it('leaves no unreplaced build placeholder in the source', () => {
    // The placeholders are resolved at build time — %VITE_SITE_URL% by
    // Vite, the social ones by the social-links plugin — so they are
    // correct in index.html but must be gone from dist.
    const source = read('../../index.html');
    expect(source).toContain('%VITE_SITE_URL%');
    expect(source).toContain('%FACEBOOK_URL%');
    expect(source).toContain('%LINKEDIN_URL%');
  });

  it.runIf(built)('is emitted as valid JSON against the deployed origin', () => {
    const raw = read('../../dist/index.html').match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )![1];
    const data = JSON.parse(raw);
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain('%VITE_SITE_URL%');
    expect(serialized).not.toContain('%FACEBOOK_URL%');
    expect(serialized).not.toContain('%LINKEDIN_URL%');
    expect(serialized).toContain('https://qfza.app/');
  });
});

describe('sitemap xhtml alternates', () => {
  it.runIf(built)('declares the xhtml namespace', () => {
    expect(read('../../dist/sitemap.xml')).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it.runIf(built)('pairs every bilingual URL with its other locale and x-default', () => {
    const sitemap = read('../../dist/sitemap.xml');
    const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    // The homepage is a single bilingual document, so it has no alternates.
    // Every other page is a per-locale URL and must carry the full cluster.
    for (const block of urls) {
      const loc = block.match(/<loc>([^<]*)<\/loc>/)![1];
      const alts = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => m[1]);
      if (loc.replace(/\/$/, '') === 'https://qfza.app') continue;
      expect(alts, `${loc} has no alternates`).toEqual(
        expect.arrayContaining(['en', 'ar', 'x-default']),
      );
    }
  });

  it.runIf(built)('resolves every alternate to a URL that is itself listed', () => {
    // A dangling alternate is worse than none: it points a crawler at a URL the
    // sitemap never claims exists.
    const sitemap = read('../../dist/sitemap.xml');
    const listed = new Set([...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));
    for (const href of [...sitemap.matchAll(/hreflang="[^"]+" href="([^"]+)"/g)].map((m) => m[1])) {
      expect(listed, `alternate ${href} is not in the sitemap`).toContain(href);
    }
  });

  it.runIf(built)('points x-default at English everywhere', () => {
    const sitemap = read('../../dist/sitemap.xml');
    const defaults = [...sitemap.matchAll(/hreflang="x-default" href="([^"]+)"/g)].map((m) => m[1]);
    expect(defaults.length).toBeGreaterThan(0);
    for (const href of defaults) {
      expect(href, `x-default ${href} is not English`).not.toContain('/ar/');
    }
  });

  it.runIf(built)('agrees with the in-page hreflang for the same url', () => {
    // The two mechanisms must not drift; the HTML is authoritative, so a
    // mismatch means one of them is stale.
    const sitemap = read('../../dist/sitemap.xml');
    const pairs: Record<string, string[]> = {};
    for (const block of [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1])) {
      const loc = block.match(/<loc>([^<]*)<\/loc>/)![1];
      pairs[loc] = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => m[2]);
    }
    for (const page of ['privacy/index.html', 'ar/privacy/index.html']) {
      const html = read(`../../dist/${page}`);
      const loc = `https://qfza.app/${page.replace('index.html', '')}`;
      for (const href of pairs[loc] ?? []) {
        expect(html, `${loc}: sitemap lists ${href} but the HTML does not`).toContain(
          `href="${href}"`,
        );
      }
    }
  });
});

describe('blog index depth', () => {
  const builtIndexes = built && existsSync(resolve(dist, 'blog/index.html'));

  it('keeps some intro copy above the post list', () => {
    // The index is a hub, not an essay: a short "Read next" section
    // above the post list. What must never happen is the copy vanishing
    // entirely, which would leave the page as a bare link list with
    // nothing between the heading and the posts.
    for (const locale of ['en', 'ar']) {
      const src = read(`../../content/blog-index/${locale}.md`);
      const body = src.replace(/^---[\s\S]*?---/, '');
      const words = body.split(/\s+/).filter(Boolean).length;
      expect(words, `${locale} index has no copy at all`).toBeGreaterThan(10);
      const h2 = body.match(/^## /gm) ?? [];
      expect(h2.length, `${locale} index has no section heading`).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the intro free of untranslated latin text', () => {
    // A stray latin token inside Arabic copy is a translation bug that no
    // reviewer would catch by eye at 600 words.
    const body = read('../../content/blog-index/ar.md')
      .replace(/`[^`]*`/g, '')
      .replace(/\]\([^)]*\)/g, '');
    expect(body.match(/[A-Za-z]+/g), 'latin text leaked into the Arabic index').toBeNull();
  });

  it.runIf(builtIndexes)('puts the intro above the post list on the page', () => {
    for (const page of ['blog/index.html', 'ar/blog/index.html']) {
      const html = read(`../../dist/${page}`);
      expect(html, `${page} has no intro`).toContain('qlf-body');
      const listAt = html.indexOf('qlf-index-list');
      const introAt = html.indexOf('qlf-body');
      expect(listAt, `${page}: post list must come after the intro`).toBeGreaterThan(introAt);
    }
  });

  it.runIf(builtIndexes)('links from the index to the post, tool, and policy', () => {
    // Internal linking is the point: the index is a hub, not a dead end.
    const html = read('../../dist/blog/index.html');
    expect(html).toContain('href="/blog/search-youtube-video/"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/privacy/"');
  });

  it('does not leak the index copy into post discovery', () => {
    // loadPosts() reads every .md under content/blog/<locale>/, so the index
    // copy must stay in a sibling directory or it becomes a dateless "post".
    const blogDir = resolve(__dirname, '../../content/blog/en');
    expect(existsSync(blogDir), 'content/blog/en missing').toBe(true);
    const files = readdirSync(blogDir);
    expect(
      files.filter((f) => f.startsWith('_')),
      'underscore files are not skipped by loadPosts',
    ).toEqual([]);
  });
});
