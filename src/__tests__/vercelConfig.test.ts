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
const built = (path: string) =>
  existsSync(resolve(root, 'dist', path.replace(/^\//, ''), 'index.html'));

/** Client-only routes: served by the app, so never a file in dist/. */
const SPA_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/history',
  '/profile',
];

/** Every generated document, written the way the static tree spells it. */
const DOCUMENTS = [
  '/about/',
  '/terms/',
  '/contact/',
  '/faq/',
  '/privacy/',
  '/blog/',
  '/blog/search-youtube-video/',
];

interface Redirect {
  source: string;
  destination: string;
  statusCode?: number;
}

// Scoped to the retired set rather than to "/blog/": the config also carries
// slashless-spelling redirects like /blog/search-youtube-video, which are a
// different concern and would otherwise be counted as retired articles.
const blogRedirects = (redirects: Redirect[]) =>
  redirects.filter((r) => RETIRED.includes(r.source));
const arBlogRedirects = (redirects: Redirect[]) =>
  redirects.filter((r) => RETIRED.includes(r.source) && r.source.startsWith('/ar/blog/'));

describe('vercel.json redirects', () => {
  const live = JSON.parse(read('vercel.json'));

  it('covers every retired URL exactly once', () => {
    // Scoped to the blog: the config also carries the retired hash routes below,
    // and those are a separate concern with their own tests.
    const sources = blogRedirects(live.redirects).map((r) => r.source);
    expect(sources.slice().sort()).toEqual(RETIRED.slice().sort());
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('sends all three English URLs to the English replacement', () => {
    const en = blogRedirects(live.redirects).filter((r) => !r.source.startsWith('/ar/'));
    expect(en).toHaveLength(3);
    for (const r of en) expect(r.destination).toBe(REPLACEMENT);
  });

  it('sends all three Arabic URLs to the Arabic replacement', () => {
    // Pointing an Arabic URL at the English article would bounce the visitor
    // across languages and break the hreflang pairing.
    const ar = arBlogRedirects(live.redirects);
    expect(ar).toHaveLength(3);
    for (const r of ar) expect(r.destination).toBe(AR_REPLACEMENT);
  });

  it('declares no redirect source containing a fragment', () => {
    // A fragment never leaves the browser: it is not part of the HTTP request, so
    // a `source` of `/#/login` can never match anything. Such a rule is dead
    // config that reads as if the old URLs are handled at the edge — and `#` is
    // not even a legal path character, so it risks the whole file being rejected.
    //
    // Those URLs are handled where they actually arrive, in the client: `useRoute`
    // reads the fragment, rewrites the address bar with `replaceState` and renders
    // the clean route. A server cannot do this job, so it is not attempted here.
    for (const r of live.redirects as Redirect[]) {
      expect(r.source, `${r.source} can never match a request`).not.toContain('#');
    }
  });

  it('sends the slashless spelling of every document to its canonical one', () => {
    // Each document is written as <slug>/index.html, so `/about` and `/about/` are
    // the same file on disk. Static hosts are inconsistent about redirecting the
    // slashless form: `vite preview` serves the homepage for `/about`, which makes
    // the homepage reachable at a second address that canonicalises elsewhere.
    // That is duplicate content with no warning, so it is pinned explicitly.
    const bySource = new Map<string, Redirect>();
    for (const r of live.redirects as Redirect[]) bySource.set(r.source, r);

    for (const document of DOCUMENTS) {
      const source = document.slice(0, -1);
      expect(bySource.get(source)?.destination, `${source} must reach ${document}`).toBe(document);
      const arSource = `/ar${source}`;
      expect(bySource.get(arSource)?.destination, `${arSource} must reach /ar${document}`).toBe(
        `/ar${document}`,
      );
    }
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
    // 404, and nothing else in the build notices. A client route is the one
    // legitimate exception — it is served by the rewrite below, not from disk.
    for (const r of live.redirects) {
      if (SPA_ROUTES.includes(r.destination)) continue;
      expect(built(r.destination), `${r.destination} is not in dist/`).toBe(true);
    }
  });

  it('does not shadow a page that still exists', () => {
    for (const r of live.redirects) {
      // The slashless spelling of a document resolves to that same directory, so
      // `built()` is true by construction and says nothing about shadowing. What
      // must not happen is a redirect whose source is a page that still exists at a
      // *different* path than it points to.
      if (r.source === r.destination.slice(0, -1)) continue;
      expect(built(r.source), `${r.source} is redirected but also still built`).toBe(false);
    }
  });

  it('has no catch-all route that could take the site down', () => {
    // `routes` stays forbidden outright: a legacy catch-all there overrides the
    // static tree and a typo in it takes the whole site offline.
    expect(live.routes).toBeUndefined();
  });
});

describe('vercel.json rewrites', () => {
  const live = JSON.parse(read('vercel.json'));
  const rewrites = live.rewrites as Array<{ source: string; destination: string }>;

  it('serves the API from the backend so the browser sees one origin', () => {
    // Same-origin is what makes cookie auth work at all: the session cookie is
    // set on qfza.app by the backend's Set-Cookie, and without the rewrite the
    // browser would treat the API as a third party and refuse to send it.
    const api = rewrites.filter((r) => r.source.startsWith('/api'));
    expect(api).toHaveLength(1);
    expect(api[0].source).toBe('/api/:path*');
    expect(api[0].destination).toBe('https://jumpto-backend.vercel.app/api/:path*');
  });

  it('points the rewrite at the deployed backend, not a preview host', () => {
    for (const r of rewrites) {
      expect(r.destination).not.toMatch(/vercel\.app.*-git-|-[a-z0-9]{20}\.vercel\.app/);
    }
  });

  it('rewrites every client route onto the SPA shell, and nothing else', () => {
    // Two of these arrive as emailed links: the backend builds its messages as
    // <PUBLIC_SITE_URL>/verify-email?token=… and /reset-password?token=…, so they
    // were real paths before hash routing was replaced and must keep resolving.
    // The other four are reachable from a signed-in session and by bookmark, so
    // they have to survive a reload and a shared link the same way. Contact is
    // absent on purpose: it is a generated page, and rewriting it would serve
    // index.html over its markdown.
    const spa = rewrites.filter((r) => r.destination === '/index.html');
    expect(spa.map((r) => r.source).sort()).toEqual([...SPA_ROUTES].sort());
    expect(spa.map((r) => r.source)).not.toContain('/contact/');
  });

  it('never rewrites a path to a page that is actually built', () => {
    // A rewrite is applied before the static lookup, so one aimed at a real
    // page would shadow it and serve index.html with a 200 instead.
    for (const r of rewrites) {
      const source = r.source.replace(/:\w+\*$/, '');
      expect(built(source), `${r.source} would shadow a built page`).toBe(false);
    }
  });

  it('has no catch-all rewrite', () => {
    // The failure this guards: /(.*) → /index.html silently swallows asset
    // 404s and API errors, and a typo in the destination is a blank site. Every
    // rule must name a path prefix; a wildcard is only allowed once that prefix
    // is a real segment.
    for (const r of rewrites) {
      expect(r.source, `${r.source} matches everything`).not.toMatch(/^\/\(\.\*\)$/);
      expect(r.source, `${r.source} has no path prefix`).not.toMatch(/^\/:/);
      expect(r.source, `${r.source} has no path prefix`).not.toMatch(/^\/\*$/);
    }
  });

  it('keeps the API rewrite first, so it wins over any later overlap', () => {
    // Vercel applies rewrites in order and takes the first match. The API rule
    // must precede anything that could shadow it.
    expect(rewrites[0].source).toBe('/api/:path*');
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
