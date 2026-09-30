import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const exists = (p: string) => existsSync(resolve(root, p));

/** The six URLs that were live before the blog was consolidated. */
const RETIRED = [
  '/blog/lose-place-lecture-video/',
  '/blog/search-youtube-transcript/',
  '/blog/why-youtube-search-fails/',
  '/ar/blog/lose-place-lecture-video/',
  '/ar/blog/search-youtube-transcript/',
  '/ar/blog/why-youtube-search-fails/',
];

const REPLACEMENT = '/blog/search-youtube-video/';
const AR_REPLACEMENT = '/ar/blog/search-youtube-video/';

/** A built page exists at dist/<path>/index.html. */
const built = (path: string) => existsSync(resolve(root, 'dist', path.replace(/^\//, ''), 'index.html'));

describe('vercel.json redirects', () => {
  const live = JSON.parse(read('vercel.json'));

  it('covers every retired URL exactly once', () => {
    const sources = live.redirects.map((r: { source: string }) => r.source);
    expect(sources.slice().sort()).toEqual(RETIRED.slice().sort());
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('sends all three English URLs to the English replacement', () => {
    const en = live.redirects.filter((r: { source: string }) => r.source.startsWith('/blog/'));
    expect(en).toHaveLength(3);
    for (const r of en) expect(r.destination).toBe(REPLACEMENT);
  });

  it('sends all three Arabic URLs to the Arabic replacement', () => {
    // Pointing an Arabic URL at the English article would bounce the visitor
    // across languages and break the hreflang pairing.
    const ar = live.redirects.filter((r: { source: string }) => r.source.startsWith('/ar/'));
    expect(ar).toHaveLength(3);
    for (const r of ar) expect(r.destination).toBe(AR_REPLACEMENT);
  });

  it('uses 301, not the 308 that Vercel infers from permanent:true', () => {
    // `permanent: true` is 308 on Vercel. A moved page hands over ranking signal
    // with a 301, so the status is explicit and this fails if someone swaps it
    // for the boolean.
    for (const r of live.redirects) {
      expect(r.statusCode, `${r.source} must be a 301`).toBe(301);
      expect(r, `${r.source} must not use the permanent boolean`).not.toHaveProperty('permanent');
    }
  });

  it('only ever redirects to pages that were actually built', () => {
    // The expensive failure: a typo in a destination turns a redirect into a
    // 404, and nothing else in the build notices.
    for (const r of live.redirects) {
      expect(built(r.destination), `${r.destination} is not in dist/`).toBe(true);
    }
  });

  it('does not shadow a page that still exists', () => {
    for (const r of live.redirects) {
      expect(built(r.source), `${r.source} is redirected but also still built`).toBe(false);
    }
  });

  it('has no catch-all route that could take the site down', () => {
    expect(live.routes).toBeUndefined();
    expect(live.rewrites).toBeUndefined();
  });
});

describe('maintenance middleware', () => {
  const mw = read('middleware.ts');

  it('exists, because a vercel.json routes block cannot do this job', () => {
    // Verified against `vercel dev`: `routes` with status 503 returns Vercel's
    // own "deployment is currently unavailable" body and browsers ignore the
    // Location header on a 503. Only middleware can serve our page with a 503.
    expect(exists('middleware.ts')).toBe(true);
  });

  it('answers 503 with the real maintenance HTML', () => {
    expect(mw).toMatch(/new Response\(renderMaintenance\(SITE_URL\)/);
    expect(mw).toContain('status: 503');
  });

  it('sends Retry-After and a noindex header', () => {
    // Retry-After is what actually stops a crawler hammering a down site.
    expect(mw).toContain("'retry-after': '3600'");
    expect(mw).toContain("'x-robots-tag': 'noindex, follow'");
  });

  it('never caches the maintenance response', () => {
    // A cached 503 would outlive the outage and take the site down with it.
    expect(mw).toContain('no-store');
  });

  it('lets assets and crawler files through, so the page is not unstyled', () => {
    for (const keep of ['assets/', 'fonts/', 'favicon', 'logo', 'robots\\.txt', 'sitemap\\.xml']) {
      expect(mw, `${keep} is not passed through`).toContain(keep);
    }
    // The list is worthless unless something consults it. A mutation that
    // deleted the guard passed while every literal above was still present.
    expect(mw).toMatch(/PASSTHROUGH\.test\(pathname\)/);
  });

  it('only engages when the flag is on', () => {
    expect(mw).toContain('isOn(process.env.VITE_MAINTENANCE)');
    // Must bail out before touching the request when off, otherwise every page
    // view would depend on an edge invocation.
    const bail = mw.indexOf('isOn(process.env.VITE_MAINTENANCE)');
    const response = mw.indexOf('new Response(renderMaintenance');
    expect(bail).toBeGreaterThan(-1);
    expect(bail).toBeLessThan(response);
  });

  it('reads the same flag as the build-time page', () => {
    // If the middleware and the build-time swap ever disagree you get a 503 on
    // a live site, or a 200 that claims to be down. Both read VITE_MAINTENANCE,
    // and both use the same parser, so "on" cannot mean two different things.
    const build = read('scripts/apply-maintenance.mjs');
    expect(build).toContain('env.VITE_MAINTENANCE');
    expect(build).toContain('isMaintenanceOn');
    expect(mw).toContain('process.env.VITE_MAINTENANCE');
    // Same truthy set in both places.
    for (const flag of ['1', 'true', 'yes', 'on']) {
      expect(read('scripts/lib/maintenance.mjs')).toContain(`'${flag}'`);
      expect(mw).toContain(`'${flag}'`);
    }
  });
});
