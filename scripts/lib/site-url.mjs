import { loadEnv } from 'vite';

import { ROOT } from './blog.mjs';

/**
 * Resolve the canonical origin for a production build.
 *
 * `.env` is gitignored and locally holds `VITE_SITE_URL=http://localhost:5174`
 * for dev. Vite substitutes `%VITE_SITE_URL%` from that file too, so a plain
 * `npm run build` used to bake localhost into every canonical, hreflang, og:url,
 * sitemap loc and robots Sitemap line — and would still exit 0. Deployed, the
 * site would self-canonical to localhost and be effectively unindexable.
 *
 * So a non-HTTPS or loopback origin is a hard failure here, not a warning: it is
 * the one class of build error that produces output which looks completely fine
 * and is wrong in a way no later step can detect. Set VITE_SITE_URL in the
 * environment, or export VITE_ALLOW_LOCAL_BUILD=1 to build a local-only preview
 * (that escape hatch is deliberately opt-in).
 */
export function resolveSiteUrl() {
  const env = loadEnv('production', ROOT, '');
  const raw = (env.VITE_SITE_URL || '').trim();
  const siteUrl = (raw || 'https://qfza.app').replace(/\/+$/, '');

  if (env.VITE_ALLOW_LOCAL_BUILD) return siteUrl;

  let url;
  try {
    url = new URL(siteUrl);
  } catch {
    throw new Error(`[site-url] VITE_SITE_URL is not a valid URL: ${siteUrl}`);
  }

  const loopback = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' || loopback) {
    throw new Error(
      `[site-url] refusing to build with origin "${siteUrl}".\n` +
        '  A production build bakes this into canonical, hreflang, og:url, sitemap.xml\n' +
        '  and robots.txt. Building against localhost or plain http produces a site\n' +
        '  that self-canonicals to a loopback address and cannot rank.\n' +
        '  Set VITE_SITE_URL in the environment, or export VITE_ALLOW_LOCAL_BUILD=1\n' +
        '  if you are deliberately building a local-only preview.',
    );
  }
  return siteUrl;
}
