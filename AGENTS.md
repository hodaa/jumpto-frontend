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
- The app is bilingual EN/AR with RTL support. `<html dir>` and `lang` come from the persisted `jumpto.lang` (see `src/i18n/index.ts`). Verify any layout change in both `ltr` and `rtl`, and prefer logical utilities (`start-*`, `end-*`, `ps-*`, `pe-*`, `rtl:` variants) over physical ones.
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

## Progress Counting

- Constants at the top of `src/App.tsx`: `PROGRESS_INITIAL=10`, `PROGRESS_TICK_STEP=10`, `PROGRESS_FALLBACK_TICK_MS=3000`, `PROGRESS_MIN_TICK_MS=1000`, `PROGRESS_TOTAL_STEPS=10`, `PROGRESS_MAX=90`. The counter is a self-rescheduling `setTimeout` in `App.tsx` that divides the estimated wait into 10 equal segments (one per 10% step): a 60s estimate advances the bar by 10 every 6 seconds. Preserve 10-step values and the `PROGRESS_MAX=90` cap (never 100 before results).
- **The displayed percentage must always be a multiple of 10 (10 → 20 → 30 → … → 90), and the counter must only ever advance by exactly one 10-step at a time — never jump (e.g. 40 → 60).** The local timer only ticks `PROGRESS_TICK_STEP` at a time and must schedule its next tick from the timeout callback, never from inside a `setState` updater (React double-invokes updaters, which forks the chain into double ticks). `handlePollProgress` in `App.tsx` must snap any server progress value down to the nearest multiple of `PROGRESS_TICK_STEP` and then clamp it to at most `current + PROGRESS_TICK_STEP` (one step per poll) — never pass a raw server number to `setProgress`. Do not change this.

## Rules for Generated Artifacts & Code Coverage

- **NEVER** parse, read, or inject HTML/files generated inside the `coverage/` folder into source code files (`src/`).
- **Ignore Coverage Artifacts**: Treat the `coverage/` directory as strictly gitignored and excluded from context.
- **Pure Source Code**: Never include test-coverage metrics, runner outputs, or raw HTML reports inside UI components or application code.