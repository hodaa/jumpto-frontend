# Agent Guide

## Verification (run after any change)

- `npm test` — Vitest (jsdom + Testing Library).
- `npm run lint` — ESLint.
- `npx tsc --noEmit` — typecheck.
- `npm run build` — `tsc --noEmit && vite build`.
- `npm run format` — Prettier (opt-in; only run when asked).

## UI / Styling

- **Use Tailwind CSS for all UI changes.** Tailwind v4 is wired into the Vite build via the `@tailwindcss/vite` plugin and imported at the top of `src/index.css` (`@import 'tailwindcss';`). There is no `tailwind.config` file — configuration is CSS-first inside the `@theme` block.
- Brand tokens live in `@theme` in `src/index.css`: `--color-primary` (navy) and `--color-accent` (`#ea580c`, bright orange). Use the generated utilities (`bg-primary`, `text-accent`, `border-accent/30`, …). Never hardcode a brand hex in component JSX — plain CSS `var(--color-accent)` is fine inside `src/index.css`.
- Prefer utility classes directly in component JSX over hand-written CSS. Only add a custom class in `src/index.css` when Tailwind utilities cannot express the style (e.g., full-bleed layout, RTL-specific overrides for Arabic, or reused compound patterns).
- Loading states use the `StatusCard` split-view pattern: apply its `skeleton` prop (`animate-pulse` partitions) for placeholders. Keep `aria-busy` on the visual status card and the single persistent search live region outside it; do not announce every percentage/ETA tick.
- The keyword input switches direction based on the detected script of the typed text (`dir={keywordDir}` in `SearchForm.tsx`) — keep the inline `style={{ textAlign, direction }}` (a test pins it) and the injected `.search-input--rtl/--ltr::placeholder` rules.
- The URL field follows the UI language by explicit user preference: RTL/right-aligned in Arabic, LTR/left-aligned in English. Its wrapper, text and placeholder share `urlDir`, while its padding and errors depend only on URL state. Never derive URL direction from the keyword, and do not modify the URL value when switching languages.
- There is no global `[dir='rtl']` input override. Do not reintroduce one (it fights per-field `text-left`/`text-right` utilities).

## Form Validation (single strategy — `SearchForm.tsx`)

- **Custom validation is the only validation.** The `<form>` carries `noValidate`, so the browser never shows its own English-only tooltips in an EN/AR app. Validity comes from `validateUrl` (backed by `inspectYouTubeUrl`, also used by `parseYouTubeId`) and `validateKeyword`; use those functions rather than re-implementing checks.
- Field state stores untranslated **error codes** (`'required' | 'invalid'`) that are resolved with `t()` at render time, so a visible error re-translates when the user switches language.
- Errors surface on submit only (typing is quiet until then). On an invalid submit, focus the **first** invalid field in DOM order (`urlRef` / `keywordRef`).
- Fields are read-only while searching; Cancel restores editing. Retry uses `SearchFormHandle.submit()` so it validates the current fields, not the last submitted query.
- Paste and per-field clear controls have 44px targets. URL clear sits beside its label to leave space for the URL text; its Paste button stays in the field.
- Once a field has an error, `onChange` re-validates it, so the error clears or updates as soon as the value is corrected.
- An invalid field must be marked three ways: `aria-invalid` + `aria-describedby` (error text), a **red border/tint** (`fieldStateClass`, `border-rose-500`), and an `IconAlert` icon in the field and beside the message. `inputClass` holds no colour utilities on purpose — never add a second `border-*`/`bg-*` that would fight the error state.

## Layout

- Shell lives in `src/App.tsx`: `SiteHeader`, then a responsive two-column grid `lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]` (stacks to one column below `lg`). Left column = `SearchForm`; right column = `ResultsPanel`. `Hero` renders compact above the grid; `HowItWorks` + `Features` remain mounted below the grid in every phase so header anchors always work. Do not steal focus from these sections when a background search finishes.
- Preserve the requested bright-orange step circles and dashed idle-result border (`accent`), plus locale-specific brand names: “Qfza” in English and “قفزة” in Arabic, including page metadata. The header uses `/logo-en.svg` (“Qfza”) with the icon on the left in English and the unchanged `/logo.svg` with the icon on the right in Arabic (reorder elements; never mirror the play icon), with localized `app.logoAlt` and `nav.home` labels.
- `ResultsPanel` drives a phase state machine (`idle` → `processing` → `done` | `error`) with `StatusCard` during `processing`. Both columns are always mounted; the right shows an idle placeholder before any search runs.
- **New pages must reuse the home shell — content only.** Every SPA route renders via `PageShell` (`src/App.tsx:733`): `div.app` + skip-link + `SiteHeader` + `main.app-main#main-content` + `SiteFooter`. Add a `<PageShell><NewPage /></PageShell>` branch in `App.tsx`; the page component must not render its own header, footer, `main`, skip-link, or `div.app`. Centered form pages use `AuthCard` (`src/components/AuthCard.tsx`, `max-w-xl`); do not invent a new card wrapper or custom outer `max-w`/padding.

## SEO / Sitemap

- **The sitemap is auto-generated at build time — never hand-edit `dist/sitemap.xml`.** The build pipeline is: `vite build` → `build-blog.mjs` → `build-legal.mjs` → `prerender.mjs` → `apply-maintenance.mjs`. `prerender.mjs` reads `blog-manifest.json` and `legal-manifest.json` and emits `sitemap.xml` + `robots.txt`.
- **Adding a static page automatically adds it to the sitemap.** Drop a markdown file into `content/legal/`, `content/faq/`, or `content/pages/` and it is built, listed in `legal-manifest.json`, and included in the sitemap with full hreflang alternates (en + ar + x-default). Pages MUST exist in both locales — the build throws if a twin is missing.
- **Adding a blog post automatically adds it to the sitemap.** Drop `content/blog/<locale>/<slug>.md` in both locales. Posts are discovered from the dist directory listing and get `<lastmod>` from frontmatter.
- **SPA routes are deliberately excluded from the sitemap** (they are `noindex` — client-rendered with no crawlable content). They need a Vercel rewrite in `vercel.json` so direct hits don't 404.
- **Sitemap priority/changefreq per section** is defined in the `SITEMAP` map in `scripts/build-legal.mjs` (`legal` = 0.3/yearly, `faq` = 0.7/monthly, `pages` = 0.6/monthly). Frontmatter `changefreq`/`priority` overrides the section default.
- **`x-default` hreflang points to English** (the primary SEO target). This is intentional — do not "fix" it to Arabic.

### The homepage is ONE bilingual URL that ships Arabic — do not "fix" this

An SEO audit will flag all three of these as bugs. They are one deliberate decision. Read this before changing any of them.

- **The homepage is a single URL serving both languages**, with a client-side toggle. There is deliberately **no `/ar/` homepage** — `dist/ar/index.html` is intentionally absent. So the homepage is the only indexable page with no hreflang cluster, and **that is correct**: hreflang requires a distinct URL per language, and one URL cannot form a cluster. Every *static* page (`/faq/`, `/about/`, blog, policies) does have a full en + ar + x-default cluster, and the Arabic shell on the homepage links into them.
- **`index.html` ships Arabic because a crawler sends no `Accept-Language`.** Arabic is the site's primary locale (`DEFAULT_LANGUAGE` in `src/i18n/index.ts`), and `prerenderLanguage.test.ts` pins the prerendered title, description, `og:title`, `og:image` and `og:locale` to Arabic. Do not flip the homepage to English to match the `x-default` policy: "English is the primary SEO target" refers to the **hreflang `x-default` choice on static pages**, not to the homepage's served locale.
- **The runtime *does* follow the browser's language** (`applyDocumentLanguage` in `src/i18n/index.ts`), so an English-preferring visitor gets an English page while a crawler gets Arabic. That divergence is the design, not an inconsistency.
- **The prerender shell stays `hidden`.** `prerenderShell.test.ts` asserts it, because making it visible reintroduces a flash of unstyled content on every refresh. The text is in the served HTML for crawlers either way — `hidden` does not hide it from them. "Only crawlable content lives in a hidden div" is also by design: deleting the shell would empty the homepage for search engines, which is exactly the outcome that test guards against.

## Progress Counting

- Constants at the top of `src/App.tsx`: `PROGRESS_INITIAL=10`, `PROGRESS_TICK_STEP=10`, `PROGRESS_FALLBACK_TICK_MS=3000`, `PROGRESS_MIN_TICK_MS=1000`, `PROGRESS_TOTAL_STEPS=10`, `PROGRESS_MAX=90`. The counter is a self-rescheduling `setTimeout` in `App.tsx` that divides the estimated wait into 10 equal segments (one per 10% step): a 60s estimate advances the bar by 10 every 6 seconds. Preserve 10-step values and the `PROGRESS_MAX=90` cap (never 100 before results).
- **The displayed percentage must always be a multiple of 10 (10 → 20 → 30 → … → 90), and the counter must only ever advance by exactly one 10-step at a time — never jump (e.g. 40 → 60).** The local timer only ticks `PROGRESS_TICK_STEP` at a time and must schedule its next tick from the timeout callback, never from inside a `setState` updater (React double-invokes updaters, which forks the chain into double ticks). `handlePollProgress` in `App.tsx` must snap any server progress value down to the nearest multiple of `PROGRESS_TICK_STEP` and then clamp it to at most `current + PROGRESS_TICK_STEP` (one step per poll) — never pass a raw server number to `setProgress`. Do not change this.

## Rules for Generated Artifacts & Code Coverage

- **NEVER** parse, read, or inject HTML/files generated inside the `coverage/` folder into source code files (`src/`).
- **Ignore Coverage Artifacts**: Treat the `coverage/` directory as strictly gitignored and excluded from context.
- **Pure Source Code**: Never include test-coverage metrics, runner outputs, or raw HTML reports inside UI components or application code.