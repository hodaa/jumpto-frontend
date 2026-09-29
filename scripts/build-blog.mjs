import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { loadPosts, renderPost, renderIndex, LOCALES, ROOT, CONTENT_DIR } from './lib/blog.mjs';

const dist = resolve(ROOT, 'dist');

const env = loadEnv('production', ROOT, '');
const siteUrl = (env.VITE_SITE_URL || 'https://qfza.app').replace(/\/+$/, '');

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
  await writeFile(resolve(dir, 'index.html'), renderIndex({ locale, ...ctx }));
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
