import { describe, expect, it, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { resolveSiteUrl } from '../../scripts/lib/site-url.mjs';
import { legalDevPlugin } from '../../scripts/lib/legal.mjs';

const SITE_URL = 'https://qfza.app';
const root = process.cwd();
const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe('production origin guard', () => {
  // `.env` is gitignored and locally holds VITE_SITE_URL=http://localhost:5174.
  // Vite substitutes %VITE_SITE_URL% from that file as well, so a plain
  // `npm run build` used to bake loopback into every canonical, hreflang,
  // og:url, sitemap loc and robots Sitemap line -- and still exited 0.
  it('refuses to build against a loopback origin', () => {
    process.env.VITE_SITE_URL = 'http://localhost:5174';
    expect(() => resolveSiteUrl()).toThrow(/refusing to build/);
  });

  it('refuses plain http even on a real host', () => {
    process.env.VITE_SITE_URL = 'http://qfza.app';
    expect(() => resolveSiteUrl()).toThrow(/refusing to build/);
  });

  it('refuses an unparseable origin rather than emitting broken markup', () => {
    process.env.VITE_SITE_URL = 'not a url';
    expect(() => resolveSiteUrl()).toThrow(/not a valid URL/);
  });

  it('accepts https and strips trailing slashes', () => {
    process.env.VITE_SITE_URL = 'https://qfza.app///';
    expect(resolveSiteUrl()).toBe('https://qfza.app');
  });

  it('allows a deliberate local preview behind an explicit opt-in', () => {
    process.env.VITE_SITE_URL = 'http://localhost:5174';
    process.env.VITE_ALLOW_LOCAL_BUILD = '1';
    expect(resolveSiteUrl()).toBe('http://localhost:5174');
  });
});

describe('legal dev server plugin', () => {
  /** Drive the middleware the plugin installs, with a minimal req/res. */
  async function request(path: string) {
    const middlewares: any[] = [];
    (legalDevPlugin(SITE_URL) as any).configureServer({ middlewares: { use: (fn: any) => middlewares.push(fn) } });
    expect(middlewares).toHaveLength(1);

    const req = { url: path };
    const res = {
      headers: {} as Record<string, string>,
      body: '',
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      end(html: string) {
        this.body = html;
      },
    };
    let calledNext = false;
    await middlewares[0](req, res, () => {
      calledNext = true;
    });
    return { res, passedThrough: calledNext };
  }

  it('is registered in the Vite config', () => {
    // Guards against the plugin existing but never being wired up, which is
    // what made /ar/privacy/ render the app instead of the policy.
    const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
    expect(config).toMatch(/legalDevPlugin\(siteUrl\)/);
  });

  it.each([
    ['/privacy/', 'lang="en"'],
    ['/ar/privacy/', 'lang="ar"'],
  ])('serves %s as a policy page', async (path, marker) => {
    const { res, passedThrough } = await request(path);
    expect(passedThrough).toBe(false);
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.body).toContain(marker);
    expect(res.body).toContain('qlf-post-nav');
  });

  it('links the stylesheet so HMR still applies in dev', async () => {
    const { res } = await request('/ar/privacy/');
    expect(res.body).toContain('href="/src/index.css"');
  });

  it('does not swallow unrelated single-segment paths', async () => {
    // The matcher accepts any single segment, so it has to decline anything
    // that is not a legal page and let the SPA handle it.
    const { passedThrough } = await request('/contact');
    expect(passedThrough).toBe(true);
  });
});
