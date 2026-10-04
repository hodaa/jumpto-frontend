import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderNotFound } from '../../scripts/lib/notfound.mjs';

const dist = resolve(__dirname, '../../dist');
const built = existsSync(resolve(dist, '404.html'));
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

const hasArabic = (s: string) => /[\u0600-\u06ff]/.test(s);

/**
 * Split the document into its two language blocks. Anchoring on the div class is
 * essential: a bare `lang="ar"` also appears in the stylesheet, so a looser
 * match starts inside the CSS and swallows the wrong <nav>.
 */
function blocksOf(html: string) {
  // Anchored on the 404's own link nav, not the first <nav> in the block: the
  // site header added one of those ahead of it.
  return [
    ...html.matchAll(/<div class="nf-block"[^>]*>([\s\S]*?<nav class="nf-links"[\s\S]*?)<\/nav>/g),
  ].map((m) => ({
    lang: m[0].match(/lang="([a-z]+)"/)![1],
    html: m[1],
  }));
}

describe('404 document', () => {
  const html = renderNotFound('https://qfza.app');

  it('is written to the filename static hosts look for', () => {
    // Vercel, Netlify and Cloudflare Pages all serve /404.html for unmatched
    // paths with no configuration. Any other name silently does nothing.
    expect(built, 'dist/404.html was not generated').toBe(true);
  });

  it('is never indexable', () => {
    // The whole point of a 404 is that it is not a page. Indexing it would let
    // a dead URL rank and then 404 for the visitor who clicks it.
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
  });

  it('ships no JavaScript', () => {
    // Booting the SPA here would render the app under a URL that does not exist,
    // which is a worse outcome than a plain dead-end page.
    expect(html).not.toContain('<script');
  });

  it('offers a route back into the site', () => {
    for (const href of ['href="/"', 'href="/blog/"', 'href="/privacy/"']) {
      expect(html).toContain(href);
    }
  });

  it('serves both languages, since the request language is unknowable', () => {
    // One 404 document answers for every locale, so it has to carry both.
    expect(html).toContain('lang="en"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
  });

  it('labels each link in the language of its own block', () => {
    // Guards a real bug: a shared en/ar link array had its values swapped, so the
    // English block rendered Arabic link text and vice versa.
    const blocks = blocksOf(html);
    expect(blocks.map((b) => b.lang)).toEqual(['en', 'ar']);
    for (const block of blocks) {
      for (const [, text] of block.html.matchAll(/<a [^>]*>([^<]+)<\/a>/g)) {
        expect(
          hasArabic(text),
          `${block.lang} block has ${block.lang === 'ar' ? 'Latin' : 'Arabic'} link text "${text}"`,
        ).toBe(block.lang === 'ar');
      }
    }
  });

  it('points each block at its own locale policy page', () => {
    // The Arabic block linking to the English policy would be a small but
    // visible inconsistency on the one page nobody is checking.
    const ar = blocksOf(html).find((b) => b.lang === 'ar')!;
    const en = blocksOf(html).find((b) => b.lang === 'en')!;
    expect(ar.html).toContain('href="/ar/privacy/"');
    expect(en.html).toContain('href="/privacy/"');
  });

  it('declares the language on cross-locale links', () => {
    // Matches the prerendered shell's convention, so a crawler can pair them.
    const tagged = html.match(/<a\b[^>]*hreflang="[^"]+"[^>]*>/g) ?? [];
    // Guard the guard: if hreflang disappeared entirely this loop would match
    // nothing and pass vacuously, which is exactly what it did before.
    expect(tagged.length, 'expected 4 cross-locale links (2 per block)').toBe(4);
    for (const tag of tagged) {
      expect(tag, 'cross-locale link missing lang attribute').toMatch(/lang="[a-z]+"/);
    }
  });

  it('keeps tap targets at 44px', () => {
    // Matches the app's footer links; 44px is the accessible minimum.
    expect(html).toContain('min-height:44px');
  });

  it('is kept out of the sitemap', () => {
    expect(built, 'run a build first').toBe(true);
    expect(read('../../dist/sitemap.xml')).not.toContain('404');
  });

  it.runIf(built)('uses the built origin for social images', () => {
    const builtHtml = read('../../dist/404.html');
    expect(builtHtml).toContain('https://qfza.app/og-en.png');
    expect(builtHtml).not.toContain('%VITE_SITE_URL%');
    expect(builtHtml).not.toContain('localhost');
  });
});
