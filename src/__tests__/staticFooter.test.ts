import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderFooter, FOOTER_CSS } from '../../scripts/lib/footer.mjs';
import { ARTICLE_CSS } from '../../scripts/lib/blog.mjs';
import { HEADER_CSS } from '../../scripts/lib/header.mjs';
import { document_ } from '../../scripts/lib/blog.mjs';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const SOCIAL = JSON.parse(read('src/social.json')) as {
  facebook: string;
  linkedin: string;
};

/** One page out of the shared builder, with the header rendered the way callers do. */
const page = document_({
  siteUrl: 'https://qfza.app',
  url: '/blog/some-post/',
  title: 'A post',
  description: 'A description',
  locale: 'en',
  dir: 'ltr',
  css: '',
  jsonLd: '',
  body: '<p>body</p>',
  header: '<header class="qlf-header"></header>',
});

describe('static site footer', () => {
  it('carries the product note, the link nav and the rights line', () => {
    const html = renderFooter('en');
    expect(html).toContain('Qfza — Find the moments that matter');
    expect(html).toMatch(/<nav class="qlf-footer-links" aria-label="Site links">/);
    expect(html).toMatch(/© \d{4} Qfza\. All rights reserved\./);
  });

  it('offers the same eight links as the React footer, in the same order', () => {
    // Without these, a blog post or the policy page has no route to Contact,
    // About, Terms, LinkedIn or Facebook at all — they only exist inside the app.
    const html = renderFooter('en');
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toEqual([
      '/contact/',
      '/about/',
      '/terms/',
      '/blog/',
      '/faq/',
      '/privacy/',
      SOCIAL.linkedin,
      SOCIAL.facebook,
    ]);
  });

  it('emits no hash route anywhere in the footer', () => {
    // A hash URL in the markup of an indexable page is a ranking liability, and
    // these pages ship no script — so `#/contact` would not merely look wrong, it
    // would resolve against the current static path and load nothing. Everything
    // here is a real path the build actually writes.
    for (const locale of ['en', 'ar'] as const) {
      const html = renderFooter(locale);
      expect(html, `${locale} footer`).not.toMatch(/href="[^"]*#\//);
      expect(html, `${locale} contact`).toContain(`href="/${locale === 'ar' ? 'ar/' : ''}contact/"`);
    }
  });

  it("sends every page link to this page's own locale", () => {
    for (const slug of ['contact', 'about', 'terms', 'blog', 'faq', 'privacy']) {
      expect(renderFooter('en'), slug).toContain(`href="/${slug}/"`);
      expect(renderFooter('ar'), slug).toContain(`href="/ar/${slug}/"`);
    }
  });

  it('opens social links in a new tab, without leaking the opener', () => {
    const html = renderFooter('en');
      expect(html).toContain(
        `href="${SOCIAL.linkedin}" target="_blank" rel="noopener noreferrer"`,
      );
      expect(html).toContain(
        `href="${SOCIAL.facebook}" target="_blank" rel="noopener noreferrer"`,
      );
  });

  it('renders in the page language', () => {
    const html = renderFooter('ar');
    expect(html).toContain('تواصل معنا');
    expect(html).toContain('المدونة');
    expect(html).toMatch(/<nav class="qlf-footer-links" aria-label="روابط الموقع">/);
  });

  it('emits no script, so it stays usable with JS disabled', () => {
    expect(renderFooter('en')).not.toMatch(/<script/i);
  });
});

/**
 * The static footer is a hand copy of SiteFooter, so it drifts the moment the
 * React one changes. These assertions pin the two ends of every value that has
 * to match: if SiteFooter is edited without updating scripts/lib/footer.mjs, the
 * React-side assertion fails here and names the drift.
 */
describe('static footer parity with SiteFooter', () => {
  const react = read('src/components/SiteFooter.tsx');

  it('renders the same note, nav and rights elements', () => {
    expect(react).toContain("t('footer.note')");
    expect(react).toContain("t('footer.links')");
    expect(react).toContain("t('footer.rights', { year: new Date().getFullYear() })");
    expect(FOOTER_CSS).toContain('.qlf-footer-note');
    expect(FOOTER_CSS).toContain('.qlf-footer-links');
    expect(FOOTER_CSS).toContain('.qlf-footer-rights');
  });

  it('links the same static pages the app does, in both locales', () => {
    // Blog, FAQ and policy are static HTML, so the app footer has to leave the
    // SPA for them and pick the locale from the active UI language — the same
    // reason renderFooter takes a prefix argument.
    for (const key of ['contact', 'about', 'terms', 'blog', 'faq', 'privacy']) {
      expect(react).toContain(`t('footer.${key}')`);
      expect(react).toContain(`/${key}/`);
      expect(react).toContain(`/ar/${key}/`);
    }
    // The React footer must not quietly reintroduce a hash route; the parity
    // above proves it links the same pages, this proves how it links them.
    expect(react).not.toMatch(/href="#\//);
  });

  it('keeps the same social destinations', () => {
    // Both footers read src/social.json, so the destinations cannot
    // drift by construction; this pins that the React footer still
    // imports the shared file rather than growing its own copy.
    expect(react).toContain("from '../social.json'");

    const html = renderFooter('en');
    expect(html).toContain(`href="${SOCIAL.linkedin}"`);
    expect(html).toContain(`href="${SOCIAL.facebook}"`);
  });

  it('uses the app colour tokens, not a hand-picked navy', () => {
    expect(react).toContain('text-primary');
    expect(react).toContain('hover:text-action-hover');
    expect(FOOTER_CSS).toContain('#1e3a8a');
    expect(FOOTER_CSS).toContain('#172d6e');
    expect(FOOTER_CSS).not.toContain('#02275a');
  });

  it('keeps the 44px tap targets the React footer relies on', () => {
    expect(react).toContain('min-h-11');
    expect(FOOTER_CSS).toContain('min-height:44px');
  });

  it('reproduces the fade-in the React footer animates in with', () => {
    // animate-fade-in-up plus an inline animationDelay: without these the static
    // footer simply appears while the app's rises, so the two read differently
    // even though every static value matches.
    expect(react).toContain('animate-fade-in-up');
    expect(react).toContain("animationDelay: '0.4s'");
    expect(FOOTER_CSS).toContain('@keyframes fade-in-up');
    expect(FOOTER_CSS).toMatch(/\.qlf-footer\{[^}]*animation:fade-in-up \.6s ease-out/);
    expect(FOOTER_CSS).toMatch(/\.qlf-footer\{[^}]*animation-delay:\.4s/);
  });

  it('carries the keyframes the app animates with, unmodified', () => {
    const app = read('src/index.css');
    // Compared with whitespace stripped: the copy is minified onto one line, so
    // a literal comparison would fail on formatting while missing a changed
    // distance or opacity.
    const squeeze = (value: string) => value.replace(/\s+/g, '');
    // The pattern tolerates the one level of nesting in a keyframes rule; a
    // lazy [^}]* would stop at the inner closing brace.
    const rule = /@keyframes fade-in-up\s*\{((?:[^{}]|\{[^{}]*\})*)\}/;
    const keyframes = rule.exec(app)?.[1];
    expect(keyframes).toBeTruthy();
    const staticKeyframes = rule.exec(FOOTER_CSS)?.[1];
    expect(staticKeyframes).toBeTruthy();
    expect(squeeze(staticKeyframes!)).toBe(squeeze(keyframes!));
  });

  it('gives the focus ring the keyboard affordance the app has', () => {
    expect(react).toContain('focus-visible:ring-2');
    expect(FOOTER_CSS).toContain('.qlf-footer-links a:focus-visible');
    expect(FOOTER_CSS).toContain('box-shadow:0 0 0 2px #1e3a8a');
  });

  it('leaves the contact link on the text line, as the app does', () => {
    // SiteFooter styles contact with inline-block and no min-h-11, so it has no
    // icon and no 44px target while the other four do. Applying one rule to all
    // five would make contact taller than the link beside it.
    expect(react).toMatch(
      /className="inline-block rounded-md px-2\.5 py-1\.5[^"]*"\s*\n?\s*href=\{contactUrl\}/,
    );
    expect(renderFooter('en')).toContain('<a class="qlf-footer-link-plain" href="/contact/">');
    expect(FOOTER_CSS).toContain(
      '.qlf-footer-links a.qlf-footer-link-plain{display:inline-block;min-height:0}',
    );
  });

  it('sets the line-height text-sm and text-xs carry, not the inherited 1.6', () => {
    // The app's body line-height is 1.6, so a font-size without a line-height
    // gives 14px x 1.6 = 22.4px here against Tailwind's 20px, and the footer
    // renders 6px taller than the app's. Both utilities set line-height, so both
    // have to be translated.
    const app = read('src/index.css');
    expect(app).toMatch(/\n {2}line-height: 1\.6;/);
    expect(FOOTER_CSS).toMatch(/\.qlf-footer\{[^}]*font-size:\.875rem;line-height:1\.25rem/);
    expect(FOOTER_CSS).toMatch(/\.qlf-footer-rights\{[^}]*font-size:\.75rem;line-height:1rem/);
    // The header chrome has the same two text-sm rules.
    expect(HEADER_CSS).toMatch(/\.qlf-header-nav a\{[^}]*font-size:\.875rem;line-height:1\.25rem/);
    expect(HEADER_CSS).toMatch(/\.qlf-pill\{[^}]*font-size:\.875rem;line-height:1\.25rem/);
  });

  it('uses text-muted for the rights line, not the inherited slate-500', () => {
    // --color-muted is #475569. Inheriting the footer's slate-500 made the
    // copyright line a shade lighter than the app's.
    expect(react).toContain('className="text-xs text-muted"');
    const app = read('src/index.css');
    expect(app).toMatch(/--color-muted: #475569;/);
    expect(FOOTER_CSS).toMatch(/\.qlf-footer-rights\{[^}]*color:#475569/);
  });
});

describe('footer in the shared document builder', () => {
  // Read dist/ for the same checks as below, but assert at the source too: the
  // built files are a previous build, so they cannot catch a renderer that has
  // stopped emitting the footer until someone rebuilds.
  it('emits the footer on every generated page, not just the blog ones', () => {
    // Blog posts and policy pages share this builder, so one assertion covers
    // both — and a page that lost its footer cannot pass on the blog alone.
    expect(page).toContain('<footer class="qlf-footer">');
    expect(page).toContain('qlf-footer-links');
  });

  it('styles the footer on both the inlined and the linked-CSS path', () => {
    // document_ has two style branches: dev links the app stylesheet, the build
    // inlines them. Footer CSS has to ride along in each, or the footer renders
    // unstyled in one of them.
    expect(page).toContain(FOOTER_CSS);
    const devPage = document_({
      siteUrl: 'https://qfza.app',
      url: '/blog/some-post/',
      title: 'A post',
      description: 'A description',
      locale: 'en',
      dir: 'ltr',
      css: '',
      cssHref: '/assets/index.css',
      jsonLd: '',
      body: '<p>body</p>',
    });
    expect(devPage).toContain(FOOTER_CSS);
  });
});

describe('page chrome matches the app container', () => {
  // The header and footer are page-width elements on the homepage (inside .app,
  // max-width 1200px). Inside the 44rem article column they came out 664px
  // against the app's 1152px, so they need their own wrapper.
  it.each([
    ['header', 'qlf-site-header'],
    ['footer', 'qlf-site-footer'],
  ])('wraps the %s in the 1200px container', (_label, cls) => {
    expect(page).toContain(`<div class="${cls}">`);
  });

  it('sizes both wrappers like .app in src/index.css', () => {
    const app = read('src/index.css');
    expect(app).toMatch(/\.app \{\s*max-width: 1200px;/);
    for (const cls of ['.qlf-site-header', '.qlf-site-footer']) {
      expect(ARTICLE_CSS + FOOTER_CSS).toMatch(
        new RegExp(`${cls.replace('.', '\\.')}\\{max-width:1200px`),
      );
    }
  });

  it('keeps the header out of the article column', () => {
    // Otherwise the 1fr auto 1fr grid is laid out inside 704px and the nav
    // crowds the logo and the action pill.
    expect(page.indexOf('qlf-site-header')).toBeLessThan(page.indexOf('<main class="qlf-post">'));
  });
});

describe('footer on built pages', () => {
  it.each([
    'dist/blog/index.html',
    'dist/blog/search-youtube-video/index.html',
    'dist/ar/blog/search-youtube-video/index.html',
    'dist/privacy/index.html',
    'dist/ar/privacy/index.html',
  ])('%s carries the site footer', (path) => {
    const html = read(path);
    expect(html).toContain('<footer class="qlf-footer">');
    expect(html).toContain('qlf-footer-note');
    expect(html).toContain('qlf-footer-links');
  });

  it('leaves the policy page reachable from a blog post, and back again', () => {
    // The app footer links out to /blog/ and /privacy/; the static pages have to
    // carry the same links or the site is only navigable one way.
    expect(read('dist/blog/search-youtube-video/index.html')).toContain('href="/privacy/"');
    expect(read('dist/privacy/index.html')).toContain('href="/blog/"');
  });
});
