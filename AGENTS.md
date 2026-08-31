# Agent Guide

## UI / Styling

- **Use Tailwind CSS for all UI changes.** Tailwind v4 is wired into the Vite build via the `@tailwindcss/vite` plugin and imported at the top of `src/index.css` (`@import 'tailwindcss';`). There is no `tailwind.config` file — configuration is CSS-first.
- Prefer utility classes directly in component JSX over hand-written CSS. Only add a custom class in `src/index.css` when Tailwind utilities cannot express the style (e.g., full-bleed layout, RTL-specific overrides for Arabic, or reused compound patterns).
- The app is bilingual EN/AR with RTL support — verify any layout change in both `ltr` and `rtl` (`<html dir>` is set from the persisted `jumpto.lang`).
- Keep the Skeleton / loading-state pattern consistent: use `animate-pulse` partitions (a fixed-size avatar/pill plus a stretched bar per row) rather than custom shimmer CSS.
