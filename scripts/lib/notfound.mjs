/**
 * Static 404 document.
 *
 * Static hosts (Vercel, Netlify, Cloudflare Pages) serve `/404.html` for any
 * unmatched path without configuration, so this is the only place a mistyped or
 * retired URL can be caught. It deliberately ships NO JavaScript: a 404 is a dead
 * end, and a 404 that boots the SPA just renders the app under a wrong URL.
 *
 * The page is bilingual in one document, like the prerendered homepage shell,
 * because a single 404 document serves every locale and the visitor's language
 * is not knowable at request time.
 *
 * `noindex, follow` is deliberate: a 404 must never be indexed, but the links it
 * carries still let a crawler route back into the site.
 */
import { HEADER_CSS, renderHeader } from './header.mjs';

const PAGE_CSS = `
  .nf{max-width:44rem;margin:0 auto;padding:3rem 1.25rem 4rem;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#334155;line-height:1.7}
  .nf-code{margin:0 0 .5rem;font-size:3.5rem;font-weight:800;line-height:1;color:#02275a;letter-spacing:-.02em}
  .nf h1{margin:0 0 .75rem;font-size:1.75rem;line-height:1.25;color:#02275a}
  .nf p{margin:0 0 1rem}
  .nf a{color:#c2410c;font-weight:600}
  .nf-links{display:flex;flex-wrap:wrap;gap:.75rem 1.5rem;margin:1.75rem 0 0;padding:1.25rem 0 0;border-top:1px solid #e2e8f0;font-size:.95rem}
  /* min 44px keeps the tap target accessible, matching the app's footer links. */
  .nf-links a{display:inline-flex;align-items:center;min-height:44px}
  .nf-block[lang="ar"]{direction:rtl}
`;

export function renderNotFound(siteUrl) {
  // Each block owns its links rather than sharing one translated array. A shared
  // array is easy to get backwards, and a wrong label silently ships Arabic text
  // into the English block — which reads as a bug to the visitor.
  // Cross-locale links carry hreflang + lang, matching the prerendered shell.
  const linkSets = {
    en: [
      { href: '/', text: 'Back to the search' },
      { href: '/blog/', text: 'Blog', lang: 'en' },
      { href: '/ar/blog/', text: 'Blog', lang: 'ar' },
      { href: '/privacy/', text: 'Privacy Policy' },
    ],
    ar: [
      { href: '/', text: 'العودة إلى البحث' },
      { href: '/blog/', text: 'المدونة', lang: 'en' },
      { href: '/ar/blog/', text: 'المدونة', lang: 'ar' },
      { href: '/ar/privacy/', text: 'سياسة الخصوصية' },
    ],
  };

  const renderLinks = (locale) =>
    linkSets[locale]
      .map(
        (l) =>
          `<a href="${l.href}"${l.lang ? ` hreflang="${l.lang}" lang="${l.lang}"` : ''}>${l.text}</a>`,
      )
      .join('\n    ');

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — Qfza</title>
<meta name="description" content="This page does not exist. Search inside any YouTube video on Qfza.">
<!-- A 404 must never be indexed, but its links are still worth following. -->
<meta name="robots" content="noindex, follow">
<meta property="og:site_name" content="Qfza">
<meta property="og:type" content="website">
<meta property="og:title" content="Page not found — Qfza">
<meta property="og:description" content="This page does not exist. Search inside any YouTube video on Qfza.">
<meta property="og:image" content="${siteUrl}/og-en.png">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="ar_SA">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<style>${HEADER_CSS}${PAGE_CSS.trim()}
</style>
</head>
<body>
<main class="nf">
  <div class="nf-block" lang="en" dir="ltr">
    ${renderHeader('en', '/404.html', { language: false })}
    <p class="nf-code">404</p>
    <h1>We could not find that page</h1>
    <p>The link may be broken, or the page may have moved. If you were looking for a
      video moment, you can search inside any YouTube video instead.</p>
    <nav class="nf-links">
    ${renderLinks('en')}
    </nav>
  </div>

  <div class="nf-block" lang="ar" dir="rtl">
    ${renderHeader('ar', '/404.html', { language: false })}
    <p class="nf-code">404</p>
    <h1>لم نعثر على هذه الصفحة</h1>
    <p>قد يكون الرابط معطوبًا، أو أن الصفحة قد نُقلت. إن كنت تبحث عن لحظة داخل
      فيديو، يمكنك البحث داخل أي فيديو على يوتيوب بدلًا من ذلك.</p>
    <nav class="nf-links">
    ${renderLinks('ar')}
    </nav>
  </div>
</main>
</body>
</html>
`;
}
