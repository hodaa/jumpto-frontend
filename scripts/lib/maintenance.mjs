/**
 * Maintenance page.
 *
 * A static host answers `/` with the built `index.html`, so "show a maintenance
 * page" means replacing that one document. This is the whole feature: the blog,
 * policy and 404 documents are still generated, because a maintenance page is
 * about the landing experience, not about hiding content that already exists.
 *
 * Two properties matter more than the styling:
 *
 *  - `noindex, follow`. If the flag is ever left on in production, an indexable
 *    maintenance page is how a site quietly gets deindexed. This is the single
 *    most important line in the file.
 *  - No JavaScript. A maintenance page that boots the SPA would defeat the point
 *    and would keep loading the assets that are supposedly unavailable.
 */
export function renderMaintenance(siteUrl) {
  const css = `
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:2rem 1.25rem;background:#f8fafc;color:#0f172a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Naskh Arabic",sans-serif;line-height:1.6}
  .mt-card{width:100%;max-width:34rem;background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:2.5rem 2rem;text-align:center;box-shadow:0 1px 3px rgb(15 23 42 / 6%)}
  .mt-card img{height:3rem;width:auto;margin-bottom:1.5rem}
  .mt-code{display:inline-block;margin:0 0 1rem;padding:.25rem .75rem;border-radius:9999px;background:#fff7ed;color:#c2410c;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  h1{margin:0 0 .75rem;font-size:1.5rem;line-height:1.25;color:#02275a}
  p{margin:0 0 1rem}
  .mt-block + .mt-block{margin-top:2rem;padding-top:2rem;border-top:1px solid #f1f5f9}
  a{color:#02275a;font-weight:600}
  .mt-contact{font-size:.9rem;color:#475569}
  .mt-contact a{color:#ea580c}
  `;

  const block = (dir, logo, label, heading, body) => `
    <div class="mt-block" lang="${dir}" dir="${dir === 'ar' ? 'rtl' : 'ltr'}">
      <img src="${logo}" alt="${label}" width="124" height="48">
      <p class="mt-code">${dir === 'ar' ? 'صيانة مؤقتة' : 'Temporarily down'}</p>
      <h1>${heading}</h1>
      <p>${body}</p>
      <p class="mt-contact">${dir === 'ar' ? 'تحتاج إلى مساعدة؟' : 'Need help?'}
        <a href="mailto:support@qfza.app">support@qfza.app</a>
      </p>
    </div>`;

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Qfza — down for maintenance</title>
<meta name="description" content="Qfza is briefly unavailable while we carry out maintenance. Please try again shortly.">
<meta name="robots" content="noindex, follow">
<meta name="theme-color" content="#02275a">
<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="Qfza — down for maintenance">
<meta property="og:description" content="Qfza is briefly unavailable while we carry out maintenance.">
<meta property="og:url" content="${siteUrl}/">
<meta property="og:locale" content="en_US">
<style>${css}
  </style>
</head>
<body>
<main class="mt-card">${block('en', '/logo-en.svg', 'Qfza', 'We will be back shortly', 'Qfza is down for maintenance. Nothing is lost — your saved work and history stay exactly as they were.')}
${block('ar', '/logo.svg', 'قفزة', 'سنعود قريبًا', 'قفزة تحت الصيانة الآن. لا شيء ضاع — بياناتك وسجلّك كما هما تمامًا.')}
</main>
</body>
</html>`;
}

/**
 * Truthy env values. Deliberately strict: a maintenance page that shows up
 * because of a stray space or a "no" would be much worse than one that fails to
 * show up at all.
 */
export function isMaintenanceOn(raw) {
  return ['1', 'true', 'yes', 'on'].includes(String(raw ?? '').trim().toLowerCase());
}

/**
 * Serve the maintenance page from `vite dev` for every document request, so the
 * flag can be previewed before it is ever turned on in a build. Registered
 * ahead of the SPA fallback; asset and module requests pass through untouched.
 */
export function maintenanceDevPlugin(siteUrl) {
  return {
    name: 'qfza-maintenance-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0];
        // Only intercept navigation requests. Letting /src/main.tsx through is
        // what keeps HMR working while the flag is on.
        if (req.method !== 'GET' || /\.[a-z0-9]+$/i.test(path)) return next();
        try {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderMaintenance(siteUrl));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
