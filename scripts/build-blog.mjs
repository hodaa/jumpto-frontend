import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  loadPosts,
  loadIndexIntro,
  renderPost,
  renderIndex,
  LOCALES,
  ROOT,
  CONTENT_DIR,
} from './lib/blog.mjs';
import { resolveSiteUrl } from './lib/site-url.mjs';

const dist = resolve(ROOT, 'dist');

const siteUrl = resolveSiteUrl();

const indexHtml = await readFile(resolve(dist, 'index.html'), 'utf8');

// The inline-css plugin folds Tailwind into a <style> block in index.html and
// deletes the .css asset, so blog pages reuse that exact CSS. Pick the largest
// <style> to skip the small prerender shell's scoped style.
function extractAppCss(html) {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  if (!blocks.length) {
    throw new Error('[blog] no <style> found in dist/index.html — did vite build run first?');
  }
  return blocks.sort((a, b) => b.length - a.length)[0];
}

const posts = await loadPosts(CONTENT_DIR);
if (!posts.length) {
  console.log('[blog] no posts found — skipping');
  process.exit(0);
}

const css = extractAppCss(indexHtml);
const ctx = { siteUrl, css, posts };
let written = 0;

for (const locale of Object.keys(LOCALES)) {
  if (!posts.some((p) => p.locale === locale)) continue;
  const dir = resolve(dist, LOCALES[locale].prefix.replace(/^\//, ''), 'blog');
  await mkdir(dir, { recursive: true });
  // The index carries its own intro copy so a one-post index is still a real
  // landing page rather than a stub. A missing file degrades to the bare list.
  const intro = await loadIndexIntro(locale);
  await writeFile(resolve(dir, 'index.html'), renderIndex({ locale, ...ctx, intro }));
  written += 1;
}

for (const post of posts) {
  const dir = resolve(
    dist,
    post.locale === 'en' ? '' : 'ar',
    'blog',
    post.slug,
  );
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'index.html'), renderPost(post, ctx));
  written += 1;
}

console.log(`[blog] wrote ${written} static page(s) for ${posts.length} post(s) at ${siteUrl}`);

// prerender.mjs runs after this script and needs each post's real last-modified
// date for the sitemap's <lastmod>. It has no frontmatter access of its own, so
// hand the url -> date mapping over as a build artifact. `updated` wins over
// `date` because that is what a revision actually changes.
//
// Each entry also carries its own `alternates`, so prerender can emit sitemap
// xhtml:link hreflang without re-deriving locale pairs from URL strings. Only
// this script knows which slug belongs to which translation.
const blogIndexUrl = (locale) => `${LOCALES[locale].prefix}/blog/`;
const locales = Object.keys(LOCALES);

function indexAlternates() {
  // The two indexes pair with each other, so both are listed outright rather
  // than matched by slug. English is the primary SEO target, so x-default is /en/.
  return [
    ...locales.map((l) => ({ hreflang: l, href: `${siteUrl}${blogIndexUrl(l)}` })),
    { hreflang: 'x-default', href: `${siteUrl}${blogIndexUrl('en')}` },
  ];
}

function postAlternates(post) {
  const twin = posts.find((o) => o.slug === post.slug && o.locale !== post.locale);
  const xDefault = post.locale === 'en' ? post : (twin ?? post);
  return [
    { hreflang: post.locale, href: `${siteUrl}${post.url}` },
    ...(twin ? [{ hreflang: twin.locale, href: `${siteUrl}${twin.url}` }] : []),
    { hreflang: 'x-default', href: `${siteUrl}${xDefault.url}` },
  ];
}

const entries = [];
// Only an index that was actually written may be listed, or the sitemap would
// advertise a 404 whenever a locale has no posts.
for (const locale of locales) {
  if (!posts.some((p) => p.locale === locale)) continue;
  entries.push({
    url: blogIndexUrl(locale),
    lastmod: null, // filled in by prerender, which owns index lastmod inheritance
    alternates: indexAlternates(),
  });
}
for (const post of posts) {
  entries.push({ url: post.url, lastmod: post.updated || post.date, alternates: postAlternates(post) });
}

await writeFile(resolve(dist, 'blog-manifest.json'), `${JSON.stringify(entries, null, 2)}\n`);
