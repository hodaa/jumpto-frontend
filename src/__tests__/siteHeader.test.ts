import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderHeader, counterpartPath } from '../../scripts/lib/header.mjs';
import { renderMaintenance, isMaintenanceOn } from '../../scripts/lib/maintenance.mjs';

const SITE_URL = 'https://qfza.app';
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('counterpartPath', () => {
  it.each([
    ['/blog/', '/ar/blog/'],
    ['/ar/blog/', '/blog/'],
    ['/privacy/', '/ar/privacy/'],
    ['/ar/privacy/', '/privacy/'],
    ['/blog/search-youtube-video/', '/ar/blog/search-youtube-video/'],
  ])('maps %s to %s', (input, expected) => {
    expect(counterpartPath(input)).toBe(expected);
  });
});

describe('static site header', () => {
  it('links the wordmark home with a real accessible name', () => {
    const html = renderHeader('en', '/blog/');
    expect(html).toMatch(/<a class="qlf-header-logo" href="\/" aria-label="Qfza home">/);
  });

  it('uses the locale-correct wordmark, as the React Logo does', () => {
    // The Arabic wordmark keeps the icon on the right, so it is logo.svg; the
    // English one is logo-en.svg. Mirroring the play icon would be wrong.
    expect(renderHeader('en', '/blog/')).toContain('/logo-en.svg');
    expect(renderHeader('ar', '/blog/')).toContain('src="/logo.svg"');
  });

  it('prefixes nav anchors with / so they resolve off the homepage', () => {
    // The app uses bare #how-it-works, which is a dead link on a static page
    // because that anchor only exists on the homepage.
    for (const locale of ['en', 'ar'] as const) {
      const html = renderHeader(locale, '/blog/');
      expect(html).toContain('href="/#how-it-works"');
      expect(html).toContain('href="/#why-qfza"');
      expect(html).not.toMatch(/href="#(how-it-works|why-qfza)"/);
    }
  });

  it('labels the nav in the page language', () => {
    expect(renderHeader('en', '/blog/')).toContain('How it works?');
    expect(renderHeader('ar', '/blog/')).toContain('كيف يعمل؟');
  });

  it('offers a real link to the counterpart page, not a JS dropdown', () => {
    const html = renderHeader('ar', '/ar/privacy/');
    expect(html).toMatch(/class="qlf-header-lang" href="\/privacy\/" hreflang="en" lang="en"/);
  });

  it('emits no script, so it stays usable with JS disabled', () => {
    expect(renderHeader('en', '/blog/')).not.toMatch(/<script/i);
  });
});

describe('header on built pages', () => {
  it.each([
    'dist/blog/index.html',
    'dist/ar/blog/index.html',
    'dist/blog/search-youtube-video/index.html',
    'dist/privacy/index.html',
    'dist/ar/privacy/index.html',
    'dist/404.html',
  ])('%s carries the site header', (path) => {
    expect(read(path)).toContain('qlf-header-logo');
  });

  it.each([
    'dist/blog/index.html',
    'dist/ar/blog/index.html',
    'dist/privacy/index.html',
    'dist/ar/privacy/index.html',
    'dist/404.html',
  ])('%s has a way back to the homepage', (path) => {
    expect(read(path)).toMatch(/class="qlf-header-logo" href="\/"/);
  });
  it('gives each 404 locale block its own header', () => {
    // The 404 renders both locales in one document, so a substring check passes
    // as long as *one* block has a header. Both must, or one language is stuck.
    const html = read('dist/404.html');
    expect(html.match(/class="qlf-header-logo"/g) ?? []).toHaveLength(2);
    for (const [lang, logo] of [
      ['en', '/logo-en.svg'],
      ['ar', 'src="/logo.svg"'],
    ] as const) {
      const block = new RegExp(`<div class="nf-block" lang="${lang}"[\\s\\S]*?<div class="nf-block"|<div class="nf-block" lang="${lang}"[\\s\\S]*$`).exec(
        html,
      );
      expect(block, `no ${lang} block`)?.not.toBeNull();
      expect(block?.[0], `${lang} block has no header`).toContain('qlf-header-logo');
      expect(block?.[0], `${lang} block has the wrong wordmark`).toContain(logo);
    }
  });
});

describe('maintenance flag', () => {
  it.each([
    ['true', true],
    ['TRUE', true],
    ['1', true],
    ['on', true],
    ['yes', true],
    ['false', false],
    ['', false],
    ['no', false],
    [undefined, false],
    // A stray space or a typo must not take the site down; failing to show the
    // page is much cheaper than showing it by accident.
    [' true ', true],
    ['ture', false],
    ['2', false],
  ])('parses %o as %s', (raw, expected) => {
    expect(isMaintenanceOn(raw)).toBe(expected);
  });
});

describe('maintenance page', () => {
  it('is noindex, so a forgotten flag cannot deindex the site', () => {
    expect(renderMaintenance(SITE_URL)).toContain('<meta name="robots" content="noindex, follow">');
  });

  it('ships no JavaScript', () => {
    expect(renderMaintenance(SITE_URL)).not.toMatch(/<script/i);
  });

  it('serves both locales with correct dir', () => {
    const html = renderMaintenance(SITE_URL);
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('We will be back shortly');
    expect(html).toContain('سنعود قريبًا');
  });

  it('offers a contact route, since the site is otherwise unusable', () => {
    expect(renderMaintenance(SITE_URL)).toContain('mailto:support@qfza.app');
  });

  it('carries the canonical origin in og:url', () => {
    expect(renderMaintenance(SITE_URL)).toContain(`<meta property="og:url" content="${SITE_URL}/">`);
  });
});
