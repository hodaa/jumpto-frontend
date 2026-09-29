/**
 * The static, crawlable shell injected into dist/index.html before hydration.
 *
 * Kept in its own module so it can be imported by tests without executing
 * prerender.mjs, whose top-level code reads and rewrites the build output.
 *
 * Content rules this shell has to honour:
 *  - Visible markup, not <noscript>: crawlers and SEO tooling ignore noscript.
 *  - It is wiped by React on mount, so it is for crawlers and first paint only.
 *  - It must contain real <a href> paths to every other page on the site, or
 *    those pages are reachable only through sitemap.xml. The React header nav
 *    uses in-page fragments and the footer is client-rendered, so neither
 *    appears here — this nav is the only crawlable path out of the homepage.
 */
export declare const SHELL: string;
