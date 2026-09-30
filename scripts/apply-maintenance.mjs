import { loadEnv } from 'vite';

import { renderMaintenance, isMaintenanceOn } from './lib/maintenance.mjs';
import { resolveSiteUrl } from './lib/site-url.mjs';
import { ROOT } from './lib/blog.mjs';
import { resolve } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';

/**
 * Swap the built landing page for the maintenance page when VITE_MAINTENANCE is
 * on.
 *
 * Runs last in the build chain, after prerender has injected the crawlable shell
 * into dist/index.html, so the maintenance document is the final word. Running
 * earlier would let the shell injection overwrite it.
 */
const env = loadEnv('production', ROOT, '');
const siteUrl = resolveSiteUrl();
const dist = resolve(ROOT, 'dist');
const target = resolve(dist, 'index.html');

if (isMaintenanceOn(env.VITE_MAINTENANCE)) {
  const html = renderMaintenance(siteUrl);
  // Keep a copy next to it so the original landing page is recoverable from the
  // deployed artifact without a rebuild if the flag is turned off by accident.
  await readFile(target, 'utf8').then(
    (original) => writeFile(resolve(dist, 'index.original.html'), original),
    () => {},
  );
  await writeFile(target, html, 'utf8');
  await writeFile(resolve(dist, 'maintenance.html'), html, 'utf8');
  console.log(
    `[maintenance] VITE_MAINTENANCE is on — dist/index.html is now the maintenance page (noindex).`,
  );
  console.log(
    '[maintenance] Note: a static host will answer with HTTP 200. Send 503 during',
  );
  console.log(
    '[maintenance] maintenance if search engines should back off sooner (Vercel:',
  );
  console.log(
    '[maintenance] vercel.json headers; Netlify/Cloudflare: _headers).',
  );
} else {
  console.log('[maintenance] off — landing page served as normal.');
}
