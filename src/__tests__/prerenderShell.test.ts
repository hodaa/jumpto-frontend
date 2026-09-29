import { describe, expect, it } from 'vitest';
import { SHELL } from '../../scripts/lib/shell.mjs';

/**
 * The prerender shell is the only crawlable markup on the homepage: React wipes
 * #root on mount, the header nav is in-page fragments, and the footer is
 * client-rendered. If these links are missing or wrong, every blog page falls
 * back to being discovered through sitemap.xml alone.
 */
describe('prerender shell', () => {
  const hrefs = [...SHELL.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);

  it('links to both blog indexes with real paths', () => {
    // Not fragments: "#" targets resolve to the same URL and crawl nothing.
    const paths = hrefs.filter((href) => !href.startsWith('#'));
    expect(paths).toContain('/blog/');
    expect(paths).toContain('/ar/blog/');
  });

  it('leaves no page reachable only through the sitemap', () => {
    // Every href must be a path that some other page in the build also uses.
    const expected = ['/', '/blog/', '/ar/blog/', '/privacy/', '/ar/privacy/'];
    const navigable = hrefs.filter((href) => href.startsWith('/'));
    for (const path of navigable) {
      expect(expected, `shell links to unmapped path ${path}`).toContain(path);
    }
  });

  it('declares the language on every cross-locale link', () => {
    // The page is bilingual in one document, so each blog link must say which
    // language it leads to — otherwise a crawler cannot pair the two.
    const blogTags = [...SHELL.matchAll(/<a\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => /href="\/([^"]*\/)?blog\/"/.test(tag));
    // Guard the guard: a regex that matches nothing makes this loop vacuous.
    expect(blogTags, 'no blog <a> tags found to check').toHaveLength(2);

    for (const tag of blogTags) {
      const locale = /href="\/ar\//.test(tag) ? 'ar' : 'en';
      expect(tag, `missing hreflang on ${locale} blog link`).toContain(`hreflang="${locale}"`);
      expect(tag, `missing lang on ${locale} blog link`).toContain(`lang="${locale}"`);
    }
  });

  it('keeps one link per locale rather than linking the blog twice', () => {
    expect(hrefs.filter((h) => h === '/blog/')).toHaveLength(1);
    expect(hrefs.filter((h) => h === '/ar/blog/')).toHaveLength(1);
  });

  it('uses visible markup, not noscript, and keeps a single h1', () => {
    // Crawlers and SEO audit tools skip <noscript> entirely.
    expect(SHELL).not.toMatch(/<noscript/i);
    expect((SHELL.match(/<h1[\s>]/g) ?? [])).toHaveLength(1);
  });

  it('carries no content outside the two declared language blocks', () => {
    // Guards the CJK / replacement-character contamination seen in earlier
    // drafts of this file, which silently shipped to the live homepage.
    expect(SHELL).not.toMatch(/[一-鿿぀-ヿ가-힯]/);
    expect(SHELL).not.toMatch(/�/);
  });
});
