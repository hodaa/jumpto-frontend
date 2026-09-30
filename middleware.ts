import { renderMaintenance } from './scripts/lib/maintenance.mjs';

/**
 * Vercel Edge Middleware: serve the maintenance notice with a real 503.
 *
 * Why this file exists instead of a `routes` block in vercel.json:
 * vercel.json `routes` can set `status: 503`, but the response body is Vercel's
 * own generic "deployment is currently unavailable" page. A `Location` header on
 * a 503 is ignored by browsers, so a routes-based rule shows visitors a bare
 * error string while still withholding the real page. This returns the actual
 * HTML with the 503 status, which is what both crawlers and visitors need.
 *
 * Cost to be aware of: middleware runs on every matched request even when
 * maintenance is off, which adds a small amount of edge latency and counts
 * against function invocations. If that matters, delete this file when you are
 * not in a maintenance window — the build-time page in
 * `scripts/apply-maintenance.mjs` still works on its own, just with a 200.
 */

const SITE_URL = process.env.VITE_SITE_URL || 'https://qfza.app';

const isOn = (raw: string | undefined) =>
  ['1', 'true', 'yes', 'on'].includes(String(raw ?? '').trim().toLowerCase());

/**
 * Assets, icons and the crawler files must keep answering normally, otherwise
 * the maintenance page renders unstyled and you tell search engines the site is
 * gone rather than briefly unavailable.
 */
const PASSTHROUGH = /^\/(assets\/|fonts\/|favicon|logo|icon|apple-touch|robots\.txt|sitemap\.xml|site\.webmanifest|maintenance)/i;

export const config = {
  // Let Vercel serve the static tree first and only wake this for documents.
  matcher: ['/((?!assets/|fonts/|.*\\.[a-z0-9]+$).*)'],
};

export default function middleware(request: Request) {
  if (!isOn(process.env.VITE_MAINTENANCE)) {
    // Maintenance is off: hand the request back untouched.
    return;
  }

  const { pathname } = new URL(request.url);
  if (PASSTHROUGH.test(pathname)) return;

  return new Response(renderMaintenance(SITE_URL), {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Tell crawlers when to come back rather than to give up on the site.
      'retry-after': '3600',
      'x-robots-tag': 'noindex, follow',
      'cache-control': 'no-store, must-revalidate',
    },
  });
}
