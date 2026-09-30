import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHELL } from './lib/shell.mjs';
import { renderNotFound } from './lib/notfound.mjs';
import { removeOsMetadata } from './lib/osMetadata.mjs';
import { resolveSiteUrl } from './lib/site-url.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = resolve(root, 'dist');
const htmlPath = resolve(dist, 'index.html');

// Standalone scripts don't pick up Vite's env replacement, so read the same
// env Vite uses at build time and default to the published qfza.app origin.
const siteUrl = resolveSiteUrl();

const MARKER = '<div id="root"></div>';
const SHELL_MARK = 'id="app-shell"';


let html = await readFile(htmlPath, 'utf8');

if (!html.includes(MARKER)) {
  console.error(
    `[prerender] prerender shell marker not found in ${htmlPath}. ` +
      `Make sure vite build ran and emitted a default #root div.`,
  );
  process.exit(1);
}

if (html.includes(SHELL_MARK)) {
  console.error('[prerender] html already contains a prerender shell — refusing to double-inject.');
  process.exit(1);
}

// Vite replaces %VITE_SITE_URL% in index.html at build time. If the variable
// was missing the placeholder survives verbatim and would leak into canonical/
// OG tags — refuse the build instead of shipping it.
if (html.includes('%VITE_SITE_URL%')) {
  console.error(
    '[prerender] VITE_SITE_URL is unset; index.html still contains %VITE_SITE_URL%. ' +
      'Set it in .env or the host environment.',
  );
  process.exit(1);
}

// Crawlers and SEO audit tools never read a <noscript> block, so the content is
// served as real markup inside #root where they will find the headings,
// paragraphs and cross-locale links. React wipes it on mount.
//
// It carries `hidden`, though. It is a bare-text duplicate of a page React is
// about to render properly, and leaving it visible meant every refresh flashed a
// stripped, unbranded version of the homepage before the app painted. `hidden`
// keeps the markup in the DOM for crawlers while showing the visitor nothing.
// The native attribute is used over a stylesheet rule on purpose: it holds even
// if the CSS never loads, and it needs no extra bytes on the critical path.
//
// Nothing is lost for a visitor without JavaScript — the app is a client-rendered
// SPA and showed them an empty #root before this shell existed.
html = html.replace(
  MARKER,
  `<div id="root">
    <div id="app-shell" class="qlf-app-shell" hidden>
${SHELL
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')}
    </div>
    <!-- crawlable content injected by scripts/prerender.mjs -->
  `,
);

await writeFile(htmlPath, html);
console.log(`[prerender] injected static crawlable shell into ${htmlPath}`);

// Generate crawlable site files from the configured origin. These live in
// public/ sources declared per-origin; while the html env placeholder covers
// index.html, sitemap.xml/robots.txt are plain files Vite copies verbatim,
// so emit them here from the same env source of truth.
await mkdir(dist, { recursive: true });
await writeFile(
  resolve(dist, 'robots.txt'),
  ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n'),
);

// Written at the dist root because that is the filename every static host looks
// for. It is deliberately NOT added to the sitemap: listing an error page invites
// Google to index it, and the document already carries noindex, follow.
await writeFile(resolve(dist, '404.html'), renderNotFound(siteUrl));

// Blog posts are emitted by build-blog.mjs, which runs BEFORE this script. It
// also leaves blog-manifest.json behind, mapping each post url to its real
// last-modified date, so the sitemap can carry truthful <lastmod> values
// instead of guessing. Directory listing stays as the fallback so a build with
// no manifest still produces a valid (if undated) sitemap.
const manifest = await readFile(resolve(dist, 'blog-manifest.json'), 'utf8')
  .then((raw) => JSON.parse(raw))
  .catch(() => []);

  const lastmodByUrl = new Map(manifest.map((entry) => [entry.url, entry.lastmod]));

  // Legal pages ship their own manifest for the same reason: a real <lastmod> from
  // frontmatter, never the build day. A policy with a fabricated date misleads
  // users and search engines about when the terms actually changed.
  const legalManifest = await readFile(resolve(dist, 'legal-manifest.json'), 'utf8')
    .then((raw) => JSON.parse(raw))
    .catch(() => []);
  for (const entry of legalManifest) {
    if (entry.lastmod) lastmodByUrl.set(entry.url, entry.lastmod);
  }
  const legalPaths = legalManifest.map((entry) => entry.url);


const postPaths = (prefix) => {
  const base = `${prefix}/blog/`;
  return readdir(resolve(dist, base.replace(/^\//, '')), { withFileTypes: true })
    .then((entries) =>
      entries.filter((entry) => entry.isDirectory()).map((entry) => `${base}${entry.name}/`),
    )
    .catch(() => []);
};

const blogPaths = await postPaths('');
const arabicPaths = await postPaths('/ar');

// Only emit <lastmod> for urls we have a real date for. An invented or
// build-day date is worse than none — Google trusts the field as a signal.
const lastmodOf = (path, paths) => {
  const direct = lastmodByUrl.get(path);
  if (direct) return direct;
  // A blog index changes exactly when its posts do, so it inherits the newest
  // post date in its own locale rather than the build day.
  const dates = paths.map((p) => lastmodByUrl.get(p)).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
};

  // Sitemap xhtml:link alternates. Google's own docs describe these as optional
  // and secondary to the in-page hreflang, so this is belt-and-braces for crawlers
  // that read the sitemap without parsing the HTML — not a substitute for the
  // <link rel="alternate"> cluster, which remains the authoritative signal.
  // The builders own the locale pairings, so they ship the hrefs with the manifest.
  const alternates = new Map(
    [...manifest, ...legalManifest]
      .filter((e) => Array.isArray(e.alternates) && e.alternates.length)
      .map((e) => [e.url, e.alternates]),
  );

  const xhtmlLinks = (path) =>
    (alternates.get(path) ?? [])
      .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
      .join('\n');

  const entry = (url, { changefreq, priority }, lastmod, path = '') => [
    '  <url>',
    `    <loc>${url}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    ...(path && xhtmlLinks(path) ? [xhtmlLinks(path)] : []),
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');

const indexEntry = (path, paths) => {
  const url = `${siteUrl}${path}`;
  // The app shell is not content-managed, so it gets no invented lastmod.
  const lastmod = path === '/' ? null : lastmodOf(path, paths);
  return entry(url, { changefreq: 'weekly', priority: '1.0' }, lastmod, path);
};

  const postEntry = (path) =>
    entry(`${siteUrl}${path}`, { changefreq: 'monthly', priority: '0.7' }, lastmodOf(path), path);

  // Policy pages are legal documents, not content: they rank for nobody and
  // change maybe once a year, so they get the lowest priority and a yearly
  // changefreq. They stay in the sitemap because a policy a crawler cannot
  // find is a policy nobody has agreed to.
  const legalEntry = (path) =>
    entry(
      `${siteUrl}${path}`,
      { changefreq: 'yearly', priority: '0.3' },
      lastmodByUrl.get(path) ?? null,
      path,
    );


await writeFile(
  resolve(dist, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    indexEntry('/', []),
    ...(blogPaths.length ? [indexEntry('/blog/', blogPaths)] : []),
    ...(arabicPaths.length ? [indexEntry('/ar/blog/', arabicPaths)] : []),
      ...blogPaths.map(postEntry),
      ...arabicPaths.map(postEntry),
      ...legalPaths.map(legalEntry),
      '</urlset>',
    '',
  ].join('\n'),
);
  console.log(
    `[prerender] wrote sitemap.xml + robots.txt for ${siteUrl} ` +
      `(${blogPaths.length + arabicPaths.length} blog post(s), ${legalPaths.length} legal page(s) listed)`,
  );

// Vite copies public/ into dist/ verbatim, so a macOS Finder-written
// public/.DS_Store ships to the deployed site as a real file. It is untracked
// junk rather than a build problem, so scrub it from the output rather than
// failing the build — and do it last, so anything written above is covered too.
const junk = await removeOsMetadata(dist);
if (junk.length) {
  console.log(`[prerender] removed ${junk.length} OS metadata file(s) from dist:`);
  for (const file of junk) console.log(`  - ${file}`);
}