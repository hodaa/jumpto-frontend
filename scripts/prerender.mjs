import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = resolve(root, 'dist');
const htmlPath = resolve(dist, 'index.html');

// Standalone scripts don't pick up Vite's env replacement, so read the same
// env Vite uses at build time and default to the published qfza.app origin.
const env = loadEnv('production', root, '');
const siteUrl = (env.VITE_SITE_URL || 'https://qfza.app').replace(/\/+$/, '');

const MARKER = '<div id="root"></div>';
const SHELL_MARK = 'id="app-shell"';

const shell = `
<div id="app-shell">
  <div lang="en" dir="ltr">
    <h1>Search Inside YouTube Videos</h1>
    <p>Paste a YouTube video URL and search for any word or phrase. Qfza finds where it appears and lets you jump directly to that moment.</p>
    <p>Qfza (قفزة) searches a public YouTube video&rsquo;s transcript word by word and returns the exact timestamps where your phrase is spoken. Open a result to watch the moment on YouTube, or scrub no more.</p>
    <h2>How it works</h2>
    <ol>
      <li><strong>Paste a YouTube URL</strong> — a public video, not a channel or playlist.</li>
      <li><strong>Enter a word or phrase</strong> — a single word or a full sentence.</li>
      <li><strong>Jump to the moment</strong> — open an exact timestamp once your search is ready.</li>
    </ol>
    <h2>Why Qfza</h2>
    <ul>
      <li><strong>Exact phrase matching:</strong> the full transcript is searched word by word, so you only get timestamps where the exact phrase appears.</li>
      <li><strong>Faster repeat searches:</strong> a new video may take a few minutes to process, but repeat searches reuse a cached transcript.</li>
      <li><strong>Watch at the right second:</strong> every result links straight to the exact moment, so you watch the scene instead of scrubbing.</li>
    </ul>
    <p><a href="#main-content">Start searching on Qfza</a></p>
  </div>
  <div lang="ar" dir="rtl">
    <h2>قفزة — ابحث داخل فيديوهات يوتيوب وانتقل إلى اللحظة</h2>
    <p>الصق رابط فيديو على يوتيوب، وابحث عن أي كلمة أو عبارة؛ تجد «قفزة» مكان ظهورها، ويمكنك الانتقال مباشرةً إلى تلك اللحظة.</p>
    <p>يبحث تطبيق قفزة (وتُكتب أحيانًا «قفزه») في النص التفريغي لكامل الفيديو العام على يوتيوب كلمةً كلمة، ويعيد التوقيتات المحددة التي تُنطق فيها العبارة. افتح أي نتيجة لمشاهدة اللحظة على يوتيوب دون التقليب يدويًا.</p>
    <h3>كيف يعمل</h3>
    <ol>
      <li><strong>الصق رابط يوتيوب</strong> — فيديو عامًا وليس قناة أو قائمة تشغيل.</li>
      <li><strong>أدخل كلمة أو عبارة</strong> — كلمة واحدة أو جملة كاملة.</li>
      <li><strong>انتقل إلى اللحظة</strong> — انتقل إلى التوقيت المطلوب بعد اكتمال البحث.</li>
    </ol>
    <h3>لماذا قفزة؟</h3>
    <ul>
      <li><strong>مطابقة تامة للعبارة:</strong> نبحث في النص التفريغي الكامل كلمةً كلمة، فتحصل فقط على التوقيتات التي تظهر فيها العبارة نفسها تمامًا.</li>
      <li><strong>بحث أسرع عند التكرار:</strong> قد تستغرق معالجة فيديو جديد بضع دقائق، وتستفيد عمليات البحث المتكررة من النص المخزّن مؤقتًا.</li>
      <li><strong>شاهد في الثانية الصحيحة:</strong> كل نتيجة ترتبط مباشرةً باللحظة المحددة، لتشاهد المشهد بدلًا من التقليب يدويًا.</li>
    </ul>
    <p><a href="#main-content">ابدأ البحث على قفزة</a></p>
  </div>
</div>
`.trim();

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

html = html.replace(
  MARKER,
  `<div id="root"></div>
    <noscript>
${shell
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')}
    </noscript>
    <!-- crawlable fallback injected by scripts/prerender.mjs -->`,
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
await writeFile(
  resolve(dist, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${siteUrl}/</loc>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n'),
);
console.log(`[prerender] wrote sitemap.xml + robots.txt for ${siteUrl}`);