# Agent Guide

## UI / Styling

- **Use Tailwind CSS for all UI changes.** Tailwind v4 is wired into the Vite build via the `@tailwindcss/vite` plugin and imported at the top of `src/index.css` (`@import 'tailwindcss';`). There is no `tailwind.config` file — configuration is CSS-first.
- Prefer utility classes directly in component JSX over hand-written CSS. Only add a custom class in `src/index.css` when Tailwind utilities cannot express the style (e.g., full-bleed layout, RTL-specific overrides for Arabic, or reused compound patterns).
- The app is bilingual EN/AR with RTL support — verify any layout change in both `ltr` and `rtl` (`<html dir>` is set from the persisted `jumpto.lang`).
- Keep the Skeleton / loading-state pattern consistent: use `animate-pulse` partitions (a fixed-size avatar/pill plus a stretched bar per row) rather than custom shimmer CSS.

## Layout

- The landing/search screen uses a **two-column split view** (`split-view` / `split-view__column` in `src/index.css`): the left column holds the `Hero` + `SearchForm`, the right column holds the `results-canvas card` that renders the phase state (idle placeholder, `StatusCard` while processing, results or `ErrorView`). Both columns are always mounted — the right column shows a placeholder (`results-empty` + `results.idleTitle`) before any search runs. Do not collapse the layout into a single centered column; always restore/adhere to the two-column structure.


## Rules for Generated Artifacts & Code Coverage
- **NEVER** parse, read, or inject HTML/files generated inside the `coverage/` folder into source code files (`src/`).
- **Ignore Coverage Artifacts**: Treat the `coverage/` directory as strictly gitignored and excluded from context.
- **Pure Source Code**: Never include test-coverage metrics, runner outputs, or raw HTML reports inside UI components or application code.
