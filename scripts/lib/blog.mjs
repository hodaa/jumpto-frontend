import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

export const LOCALES = {
  en: { dir: 'ltr', prefix: '', ogLocale: 'en_US' },
  ar: { dir: 'rtl', prefix: '/ar', ogLocale: 'ar_AR' },
};

/** Project root, resolved from this module rather than from a caller's import.meta.url. */
function resolveRoot() {
  try {
    return resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
  } catch {
    // Vitest serves modules over a virtual URL, so import.meta.url is not a file
    // path there. The runner's cwd is the project root.
    return process.cwd();
  }
}
  export const ROOT = resolveRoot();
  export const CONTENT_DIR = resolve(ROOT, 'content/blog');
  // Blog index intro copy lives outside CONTENT_DIR on purpose: loadPosts() reads
  // every .md under content/blog/<locale>/ and would turn an index file into a
  // post with no date. A sibling directory keeps post discovery unchanged.
  export const INDEX_DIR = resolve(ROOT, 'content/blog-index');

  /** Intro copy for the /blog/ index, rendered above the post list. */
  export async function loadIndexIntro(locale) {
    const raw = await readFile(resolve(INDEX_DIR, `${locale}.md`), 'utf8').catch(() => null);
    if (!raw) return '';
    const { body } = parseFrontmatter(raw);
    return marked.parse(body);
  }


/** Split a `---` fenced YAML-ish frontmatter block off the top of a post. */
export function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

function requireFields(data, file) {
  const missing = ['title', 'description', 'date'].filter((key) => !data[key]);
  if (missing.length) {
    throw new Error(`[blog] ${file} is missing frontmatter: ${missing.join(', ')}`);
  }
}

/**
 * Read every post under `<contentDir>/<locale>/<slug>.md`.
 * EN posts publish at /blog/<slug>/, AR posts at /ar/blog/<slug>/.
 */
export async function loadPosts(contentDir) {
  const posts = [];
  for (const [locale, meta] of Object.entries(LOCALES)) {
    const localeDir = resolve(contentDir, locale);
    let files;
    try {
      files = (await readdir(localeDir)).filter((name) => name.endsWith('.md')).sort();
    } catch {
      continue;
    }
    for (const name of files) {
      const file = `${locale}/${name}`;
      const { data, body } = parseFrontmatter(await readFile(resolve(localeDir, name), 'utf8'));
      requireFields(data, file);
      const slug = data.slug || name.replace(/\.md$/, '');
      posts.push({
        slug,
        locale,
        ...meta,
        title: data.title,
        description: data.description,
        date: data.date,
        updated: data.updated || null,
        file,
        url: `${meta.prefix}/blog/${slug}/`,
        html: marked.parse(body, { async: false }),
      });
    }
  }
  // Newest first, so both the index and prev/next read naturally.
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDate = (iso, locale) =>
  new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

// Article typography. Tailwind utilities cannot express this cleanly, and the
// same rules must serve both LTR and RTL, so it is scoped here rather than in
// component JSX. Brand hexes mirror the sibling prerender shell styles.
const ARTICLE_CSS = `
.qlf-post{max-width:44rem;margin:0 auto;padding:3rem 1.25rem 4rem}
.qlf-post-nav{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;align-items:center;justify-content:space-between;margin-bottom:2.5rem;padding-bottom:1.25rem;border-bottom:1px solid #e2e8f0}
.qlf-post-nav a{color:#02275a;font-weight:600;text-decoration:none;font-size:.9rem}
.qlf-post-nav a:hover{color:#ea580c}
.qlf-post-eyebrow{margin:0 0 .5rem;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ea580c}
.qlf-post h1{margin:0 0 .75rem;font-size:2.25rem;line-height:1.2;color:var(--color-accent)}
.qlf-post-meta{margin:0 0 2rem;color:#64748b;font-size:.95rem}
.qlf-body{font-size:1.15rem;line-height:1.8;color:#334155}
.qlf-body h2{margin:2.5rem 0 .75rem;font-size:1.5rem;line-height:1.3;color:#02275a}
.qlf-body h3{margin:1.75rem 0 .5rem;font-size:1.25rem;line-height:1.35;color:#02275a}
.qlf-body p{margin:0 0 1.1rem}
.qlf-body ul,.qlf-body ol{margin:0 0 1.1rem;padding-inline-start:1.4rem}
.qlf-body li{margin-bottom:.5rem}
.qlf-body a{color:#ea580c;font-weight:600}
.qlf-body strong{color:#02275a}
.qlf-body blockquote{margin:1.5rem 0;padding:.75rem 1.25rem;border-inline-start:3px solid #ea580c;background:#fff7ed;border-radius:.5rem;color:#334155}
.qlf-body code{background:#f1f5f9;padding:.15em .4em;border-radius:.3em;font-size:.9em;direction:ltr;unicode-bidi:embed;display:inline-block}
.qlf-body pre{background:#0f172a;color:#e2e8f0;padding:1rem 1.25rem;border-radius:.75rem;overflow-x:auto;direction:ltr;text-align:left;margin:0 0 1.25rem}
.qlf-body pre code{background:none;padding:0;color:inherit}
.qlf-body img{max-width:100%;height:auto;border-radius:.75rem}
.qlf-body table{width:100%;border-collapse:collapse;margin:0 0 1.25rem;font-size:.95rem}
.qlf-body th,.qlf-body td{border:1px solid #e2e8f0;padding:.5rem .75rem;text-align:start}
.qlf-body th{background:#f8fafc;color:#02275a}
.qlf-cta{margin:2.5rem 0 0;padding:1.5rem;border-radius:.75rem;background:#02275a;color:#fff;text-align:center}
.qlf-cta p{margin:0 0 1rem;font-size:1rem;color:#e2e8f0}
.qlf-cta a{display:inline-block;background:#ea580c;color:#fff;font-weight:700;text-decoration:none;padding:.65rem 1.5rem;border-radius:.5rem;min-height:44px;line-height:2}
.qlf-cta a:hover{background:#c2410c}
.qlf-index-list{list-style:none;padding:0;margin:0}
/* Separates the intro copy from the post list below it. */
.qlf-index-heading{margin:2.5rem 0 1.25rem;font-size:1.5rem;line-height:1.3;color:#02275a;border-top:1px solid #e2e8f0;padding-top:2rem}
.qlf-index-list li{margin:0 0 1.5rem;padding-bottom:1.5rem;border-bottom:1px solid #e2e8f0}
.qlf-index-list li:last-child{border-bottom:0}
.qlf-index-list h2{margin:0 0 .35rem;font-size:1.3rem}
/* Index titles are normal-size text, where the bright brand orange misses the
   4.5:1 AA threshold, so these use the darker accent. Hover underlines so the
   state is not signalled by colour alone. */
.qlf-index-list h2 a{color:var(--color-accent-strong);text-decoration:none}
.qlf-index-list h2 a:hover{text-decoration:underline}
.qlf-index-list p{margin:0 0 .4rem;color:#475569;line-height:1.6}
.qlf-index-list time{color:#94a3b8;font-size:.85rem}
.qlf-foot{margin-top:2.5rem;padding-top:1.25rem;border-top:1px solid #e2e8f0;font-size:.9rem;color:#64748b}
.qlf-foot a{color:#02275a;font-weight:600}
`.trim();

  /** Shell shared by every generated page: metadata, inlined CSS, and JSON-LD. */
  export function document_({
  siteUrl,
  url,
  title,
  description,
  locale,
  dir,
  css,
  cssHref,
  jsonLd,
  body,
  // A listing page is a `website`, not an `article`. Getting this wrong tells
  // Google a blog index is a post, which is what it was hardcoded to before.
  ogType = 'article',
  // Only meaningful when ogType is `article`; OG consumers ignore it otherwise.
  articleTimes = '',
  // Rendered verbatim after <link rel="canonical">. Used for hreflang clusters.
  headExtra = '',
}) {
  const canonical = `${siteUrl}${url}`;
  // Build inlines the app CSS; dev links it so HMR still applies.
  const styles = cssHref
    ? `<link rel="stylesheet" href="${cssHref}">\n<style>${ARTICLE_CSS}</style>`
    : `<style>${css}\n${ARTICLE_CSS}</style>`;
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${headExtra}<meta property="og:type" content="${ogType}">
${articleTimes}<meta property="og:site_name" content="Qfza">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="${LOCALES[locale].ogLocale}">
<meta property="og:image" content="${esc(siteUrl)}/og-blog.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(siteUrl)}/og-blog.png">
<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
${jsonLd}
${styles}
</head>
<body class="bg-white text-slate-800 antialiased">
<main class="qlf-post">
${body}
</main>
</body>
</html>
`;
}

const alternates = (posts, current, siteUrl) => {
  const twin = posts.find((p) => p.slug === current.slug && p.locale !== current.locale);
  if (!twin) return '';
  return [
    `<link rel="alternate" hreflang="${twin.locale}" href="${esc(siteUrl + twin.url)}">`,
    `<link rel="alternate" hreflang="${current.locale}" href="${esc(siteUrl + current.url)}">`,
    // Arabic is the source language for this blog, so x-default points at /ar/
    // rather than the English translation. Mirrors indexAlternates below.
    '<link rel="alternate" hreflang="x-default" href="' +
      esc(siteUrl + (current.locale === 'ar' ? current.url : twin.url)) +
      '">',
  ].join('\n');
};

// The two blog indexes form their own reciprocal pair. Unlike a post pair, they
// are not found by matching a shared slug, so both locales are listed outright.
const indexAlternates = (siteUrl) => {
  const en = `${siteUrl}${LOCALES.en.prefix}/blog/`;
  const ar = `${siteUrl}${LOCALES.ar.prefix}/blog/`;
  return [
    `<link rel="alternate" hreflang="en" href="${esc(en)}">`,
    `<link rel="alternate" hreflang="ar" href="${esc(ar)}">`,
    `<link rel="alternate" hreflang="x-default" href="${esc(ar)}">`,
  ].join('\n');
};

export function renderPost(post, ctx) {
  const { siteUrl, css, cssHref, posts } = ctx;
  const siblings = posts.filter((p) => p.locale === post.locale);
  const index = siblings.indexOf(post);
  const newer = index > 0 ? siblings[index - 1] : null;
  const older = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const link = (p, rel) =>
    p ? `<a rel="${rel}" href="${p.url}">${esc(p.title)}</a>` : '<span></span>';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    inLanguage: post.locale,
    mainEntityOfPage: `${siteUrl}${post.url}`,
    url: `${siteUrl}${post.url}`,
    // Without an image, BlogPosting is not eligible for image-carrying results.
    // ImageObject with explicit dimensions is preferred over a bare URL.
    image: {
      '@type': 'ImageObject',
      url: `${siteUrl}/og-blog.png`,
      width: 1200,
      height: 630,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Qfza',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/favicon.svg` },
    },
    // Google lists `author` as a recommended BlogPosting property. No named
    // person runs the site, so the honest answer is the organisation itself
    // rather than a fabricated byline.
    author: {
      '@type': 'Organization',
      name: post.locale === 'ar' ? 'قفزة' : 'Qfza',
      url: siteUrl,
    },
  };

  // A second, standalone block rather than an @graph: the existing
  // BlogPosting test parses the first ld+json script directly, and Google
  // accepts sibling blocks. Breadcrumbs let the SERP show Home > Blog > Post.
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: post.locale === 'ar' ? 'الرئيسية' : 'Home', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: post.locale === 'ar' ? 'مدونة قفزة' : 'Qfza blog',
        item: `${siteUrl}${post.prefix}/blog/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${siteUrl}${post.url}`,
      },
    ],
  };

  // The app is a hash-routed SPA whose language comes from localStorage, so
  // there is no real /ar app path — link back to the root in both locales.
  const home = '/';
  const homeLabel = post.locale === 'ar' ? 'قفزة' : 'Qfza';
  const backLabel = post.locale === 'ar' ? 'العودة إلى قفزة' : 'Back to Qfza';
  const ctaText =
    post.locale === 'ar'
      ? 'ابحث داخل أي فيديو يوتيوب وانتقل إلى اللحظة التي تبحث عنها.'
      : 'Search inside any YouTube video and jump to the moment you need.';
  const ctaBtn = post.locale === 'ar' ? 'جرّب قفزة' : 'Try Qfza';
  const backText = post.locale === 'ar' ? 'كل المقالات' : 'All articles';


  const body = `<nav class="qlf-post-nav" aria-label="${esc(homeLabel)}">
  <a href="${home || '/'}">${esc(backLabel)}</a>
  <a href="${LOCALES[post.locale].prefix}/blog/">${esc(backText)}</a>
</nav>
<article>
<p class="qlf-post-eyebrow">${esc(homeLabel)}</p>
<h1>${esc(post.title)}</h1>
<p class="qlf-post-meta"><time datetime="${esc(post.date)}">${esc(formatDate(post.date, post.locale))}</time></p>
<div class="qlf-body">
${post.html}
</div>
</article>
<div class="qlf-cta">
  <p>${esc(ctaText)}</p>
  <a href="${home || '/'}">${esc(ctaBtn)}</a>
</div>
<nav class="qlf-post-nav" aria-label="${esc(backText)}">
  ${link(newer, 'prev')}
  ${link(older, 'next')}
</nav>
<p class="qlf-foot"><a href="${home || '/'}">${esc(homeLabel)}</a>${post.locale === 'ar' ? ' — قفزة' : ''}</p>`;

  return document_({
    siteUrl,
    url: post.url,
    title: `${post.title} — ${homeLabel}`,
    description: post.description,
    locale: post.locale,
    dir: post.dir,
    css,
    cssHref,
    jsonLd: [
      alternates(posts, post, siteUrl),
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
      `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`,
    ]
      .filter(Boolean)
      .join('\n'),
    articleTimes: [
      `<meta property="article:published_time" content="${esc(post.date)}">`,
      `<meta property="article:modified_time" content="${esc(post.updated || post.date)}">`,
    ].join('\n'),
    body,
  });
}

  export function renderIndex({ locale, posts, siteUrl, css, cssHref, intro = '' }) {
  const meta = LOCALES[locale];
  const mine = posts.filter((p) => p.locale === locale);
  const isAr = locale === 'ar';
  const home = '/';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: isAr ? 'مدونة قفزة' : 'Qfza blog',
    description: isAr
      ? 'مقالات عن البحث داخل فيديوهات يوتيوب والانتقال إلى اللحظة التي تبحث عنها.'
      : 'Articles about searching inside YouTube videos and jumping to the moment you need.',
    inLanguage: locale,
    url: `${siteUrl}${meta.prefix}/blog/`,
  };

  const items = mine
    .map(
      (p) => `<li>
  <h2><a href="${p.url}">${esc(p.title)}</a></h2>
  <p>${esc(p.description)}</p>
  <time datetime="${esc(p.date)}">${esc(formatDate(p.date, locale))}</time>
</li>`,
    )
    .join('\n');

  const body = `<nav class="qlf-post-nav" aria-label="${isAr ? 'قفزة' : 'Qfza'}">
  <a href="${home}">${isAr ? 'العودة إلى قفزة' : 'Back to Qfza'}</a>
</nav>
<p class="qlf-post-eyebrow">${isAr ? 'قفزة' : 'Qfza'}</p>
<h1>${isAr ? 'مدونة قفزة' : 'Qfza blog'}</h1>
<p class="qlf-post-meta">${
    isAr
        ? 'كيف تبحث داخل الفيديوهات وتصل إلى اللحظة التي تحتاجها.'
      : 'How to search inside YouTube videos and get to the exact moment you need.'
  }  </p>
  ${intro ? `<div class="qlf-body">
  ${intro}
</div>
  <h2 class="qlf-index-heading">${isAr ? 'أحدث المقالات' : 'Latest articles'}</h2>` : ''}
<ul class="qlf-index-list">
${items}
</ul>`;

  return document_({
    siteUrl,
    url: `${meta.prefix}/blog/`,
    // The brand is already the first half of this title, so appending the
    // usual " — Qfza" suffix rendered "Qfza blog — Qfza". Extend with the
    // topic instead, which also gives the index a keyword to rank for.
    title: isAr
      ? 'مدونة قفزة — البحث داخل فيديوهات يوتيوب'
      : 'Qfza blog — searching inside YouTube videos',
    description: isAr
      ? 'مقالات عن البحث داخل فيديوهات يوتيوب عن كلمة أو جملة، وكيف تنتقل مباشرةً إلى الدقيقة التي قيلت فيها. أدلة وأمثلة وخطوات عملية.'
      : 'Articles on searching inside YouTube videos by word or phrase, and jumping straight to the minute you need. Guides, examples and step-by-step walkthroughs.',
    locale,
    dir: meta.dir,
    css,
    cssHref,
    ogType: 'website',
    jsonLd: `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    headExtra: indexAlternates(siteUrl),
    body,
  });
}

/** Matches /blog/, /blog/<slug>/ and the /ar equivalents (trailing slash optional). */
const BLOG_ROUTE = /^\/(ar\/)?blog(?:\/([^/]+))?\/?$/;

/**
 * Serve the same static blog pages during `vite dev` that build-blog.mjs emits
 * for production, so posts are previewable at real paths before a deploy.
 * Registered ahead of Vite's SPA fallback so /blog/ is not swallowed by the app.
 */
export function blogDevPlugin(siteUrl) {
  return {
    name: 'qfza-blog-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const match = BLOG_ROUTE.exec(url);
        if (!match) return next();
        try {
          const posts = await loadPosts(CONTENT_DIR);
          const isArabic = Boolean(match[1]);
          const locale = isArabic ? 'ar' : 'en';
          const slug = match[2];
          // Same intro the production build renders, so dev and the deployed page
          // are not two different pages.
          const intro = await loadIndexIntro(locale);
          // In dev the stylesheet is linked rather than inlined so HMR still applies.
          const ctx = { siteUrl, css: '', cssHref: '/src/index.css', posts };
          const html = slug
            ? renderPost(
                posts.find((p) => p.locale === locale && p.slug === slug) ||
                  { locale, ...LOCALES[locale], url, html: '<p>Not found.</p>' },
                { ...ctx, posts },
              )
            : renderIndex({ locale, ...ctx, intro });
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
