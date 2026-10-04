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
  // `resolveSiteUrl` reads `.env` through Vite's loadEnv, which layers
  // `process.env` on top of the file rather than replacing it. So these cases
  // have to blank the flag explicitly: setting only VITE_SITE_URL still let a
  // developer's local `VITE_ALLOW_LOCAL_BUILD=1` through, and the guard quietly
  // stopped throwing on exactly the machines where someone would rely on it.
  // Empty string, not delete — removing the key hands authority back to `.env`.
  const withoutLocalOptIn = () => {
    process.env.VITE_SITE_URL = '';
    process.env.VITE_ALLOW_LOCAL_BUILD = '';
  };

  // `.env` is gitignored and locally holds VITE_SITE_URL=http://localhost:5174.
  // Vite substitutes %VITE_SITE_URL% from that file as well, so a plain
  // `npm run build` used to bake loopback into every canonical, hreflang,
  // og:url, sitemap loc and robots Sitemap line -- and still exited 0.
  it('refuses to build against a loopback origin', () => {
    withoutLocalOptIn();
    process.env.VITE_SITE_URL = 'http://localhost:5174';
    expect(() => resolveSiteUrl()).toThrow(/refusing to build/);
  });

  it('refuses plain http even on a real host', () => {
    withoutLocalOptIn();
    process.env.VITE_SITE_URL = 'http://qfza.app';
    expect(() => resolveSiteUrl()).toThrow(/refusing to build/);
  });

  it('refuses an unparseable origin rather than emitting broken markup', () => {
    withoutLocalOptIn();
    process.env.VITE_SITE_URL = 'not a url';
    expect(() => resolveSiteUrl()).toThrow(/not a valid URL/);
  });

  it('accepts https and strips trailing slashes', () => {
    withoutLocalOptIn();
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
  type Middleware = (req: { url?: string }, res: MockRes, next: () => void) => void | Promise<void>;

  class MockRes {
    headers: Record<string, string> = {};
    body = '';
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    end(html: string) {
      this.body = html;
    }
  }

  /** Drive the middleware the plugin installs, with a minimal req/res. */
  async function request(path: string) {
    const middlewares: Middleware[] = [];
    const transformed: { url: string; html: string }[] = [];
    // Narrow to just the hook shape we drive, rather than reaching into Vite's
    // full server context type (and losing `this` by destructuring it).
    const plugin = legalDevPlugin(SITE_URL) as unknown as {
      configureServer: (server: {
        middlewares: { use: (fn: Middleware) => void };
        transformIndexHtml: (url: string, html: string) => string;
      }) => void;
    };
    plugin.configureServer({
      middlewares: { use: (fn) => middlewares.push(fn) },
      // Stand-in for Vite's HTML transform, which is what injects the React Fast
      // Refresh preamble into a document Vite never templated itself.
      transformIndexHtml: (url, html) => {
        transformed.push({ url, html });
        return `${html}<!--preamble-->`;
      },
    });

    const req = { url: path };
    const res = new MockRes();
    let calledNext = false;
    await middlewares[0](req, res, () => {
      calledNext = true;
    });
    return { res, passedThrough: calledNext, transformed };
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
    ['/faq/', 'lang="en"'],
    ['/ar/faq/', 'lang="ar"'],
  ])('serves %s as a static page', async (path, marker) => {
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

  it('serves the new single-segment pages too', async () => {
    // About, Terms and Contact are ordinary generated pages, so dev has to show
    // them at their real paths or `/contact/` looks broken before a deploy.
    for (const path of ['/about/', '/terms/', '/contact/', '/ar/about/', '/ar/terms/', '/ar/contact/']) {
      const { res, passedThrough } = await request(path);
      expect(passedThrough, `${path} fell through to the SPA`).toBe(false);
      expect(res.body, path).toContain('<h1>');
    }
  });

  it('does not swallow unrelated single-segment paths', async () => {
    // The matcher accepts any single segment, so it has to decline anything
    // that is not a static page and let the SPA handle it.
    for (const path of ['/login', '/register', '/history', '/profile']) {
      const { passedThrough } = await request(path);
      expect(passedThrough, `${path} should have reached the SPA`).toBe(true);
    }
  });

  it('hydrates the contact page in dev so its form is reachable', async () => {
    // Contact is a document *and* a client route: the markdown ships for
    // crawlers, then React replaces it with the live form. Production gets the
    // built entry script from `scripts/prerender.mjs`, which only runs on a
    // build — so without dev's own injection `/contact/` renders as static prose
    // with no form at all and the form can only be worked on in a build preview.
    for (const path of ['/contact/', '/ar/contact/']) {
      const { res } = await request(path);
      expect(res.body, path).toContain('<script type="module" src="/src/main.tsx">');
    }
  });

  it('leaves pages that are not flagged hydrated script-free', async () => {
    // The markdown-only documents stay static; running the app over them would
    // hand a page it does not own to React.
    for (const path of ['/about/', '/terms/', '/privacy/', '/faq/', '/ar/faq/']) {
      const { res } = await request(path);
      expect(res.body, path).not.toContain('/src/main.tsx');
    }
  });

  it('renders no post chrome on a hydrated page', async () => {
    // Contact's markdown ships for crawlers and no-JS readers, so its HTML really
    // does reach the browser — but post chrome on it is wrong: a bare `updated`
    // date above "Contact us", plus a standfirst the app discards the moment it
    // hydrates and swaps in a live form. The date still has to reach the sitemap,
    // which reads it from the frontmatter, not from the markup.
    for (const path of ['/contact/', '/ar/contact/']) {
      const { res } = await request(path);
      // Match the elements, not the bare class names: the document's own <style>
      // block still defines `.qlf-post-eyebrow` for the pages that use it.
      expect(res.body, path).not.toContain('<p class="qlf-post-eyebrow">');
      expect(res.body, path).not.toContain('<p class="qlf-post-meta">');
      expect(res.body, path).toContain('<h1>');
    }
  });

  it('omits date eyebrow on undated markdown pages', async () => {
    // About, FAQ are deliberately undated. Privacy and Terms carry a real revision date.
    for (const path of ['/about/', '/faq/', '/ar/about/', '/ar/faq/']) {
      const { res } = await request(path);
      expect(res.body, path).not.toContain('<p class="qlf-post-eyebrow">');
      expect(res.body, path).toContain('<p class="qlf-post-meta">');
      expect(res.body, path).toContain('<h1>');
    }
    // Privacy and Terms should have the date eyebrow
    for (const path of ['/privacy/', '/ar/privacy/', '/terms/', '/ar/terms/']) {
      const { res } = await request(path);
      expect(res.body, path).toMatch(/<p class="qlf-post-eyebrow">\d{4}-\d{2}-\d{2}<\/p>/);
      expect(res.body, path).toContain('<p class="qlf-post-meta">');
      expect(res.body, path).toContain('<h1>');
    }
  });

  it('keeps a no-JS reader\'s navigation on a hydrated page', async () => {
    // The contact page is the one hydrated document, so it is the one page that
    // could lose its header and footer: React renders its own chrome, so the
    // static pair used to be marked `hidden` in the markup. That attribute is
    // unconditional — it hides the nav from crawlers and from anyone whose script
    // fails, leaving the page with no links at all. The pair must ship visible and
    // be retired by CSS once the document is known to be scripted.
    for (const path of ['/contact/', '/ar/contact/']) {
      const { res } = await request(path);
      expect(res.body, path).toContain('<div class="qlf-site-header">');
      expect(res.body, path).toContain('<div class="qlf-site-footer">');
      expect(res.body, path).not.toContain('qlf-site-header" hidden');
      expect(res.body, path).not.toContain('qlf-site-footer" hidden');
      // Flag + rule are what swap the chrome, and the flag has to be set before
      // <body> parses or the swap flashes.
      expect(res.body, path).toContain("classList.add('js')");
      expect(res.body, path).toContain('.js .qlf-site-header');
    }
  });

  it('never hides chrome on a page with no React to replace it', async () => {
    // Only a hydrated document may retire the static pair. Applying the rule
    // globally strips the navigation off every markdown-only page, which is the
    // opposite of the intent.
    for (const path of ['/about/', '/terms/', '/faq/', '/privacy/', '/ar/faq/']) {
      const { res } = await request(path);
      expect(res.body, path).not.toContain('.js .qlf-site-header');
      expect(res.body, path).toContain('<div class="qlf-site-header">');
    }
  });

  it('never constrains a hydrated page to the article column', async () => {
    // `.qlf-post` caps at 44rem, and it used to wrap `#root` — which capped the
    // entire app with it. The contact page rendered its header, form and footer
    // from the same components as the homepage but at 616px inside a 704px column
    // against the homepage's 1152px. `#root` must own the article column instead,
    // so React's `.app` is free to use its own max-width once it mounts.
    for (const path of ['/contact/', '/ar/contact/']) {
      const { res } = await request(path);
      expect(res.body, path).toContain('<div id="root"><main class="qlf-post">');
      expect(res.body, path).not.toMatch(/<main class="qlf-post">\s*<div id="root">/);
    }
  });

  it('keeps the article column on pages that do not hydrate', async () => {
    for (const path of ['/about/', '/faq/', '/terms/']) {
      const { res } = await request(path);
      expect(res.body, path).toContain('<main class="qlf-post">');
      expect(res.body, path).not.toContain('id="root"');
    }
  });

  it('serves its HTML through Vite so the React preamble is injected', async () => {
    // The plugin builds its own HTML string instead of templating `index.html`,
    // so it has to pass that string through `transformIndexHtml` — the step that
    // injects the Fast Refresh preamble. Without it every `.tsx` module throws
    // "can't detect preamble" and the page stays silently static.
    const { res, transformed } = await request('/contact/');
    expect(transformed).toEqual([
      expect.objectContaining({ url: '/contact/', html: expect.stringContaining('/src/main.tsx') }),
    ]);
    expect(res.body).toContain('<!--preamble-->');
  });
});
