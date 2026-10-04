import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Tailwind v4 only generates a utility for a color token it can see in `@theme`.
 * A token declared in a plain `:root` block is just a custom property: it works
 * in hand-written CSS via `var()`, but `bg-surface` / `border-border` written in
 * JSX silently emit nothing at all — no error, no warning, no class in the
 * stylesheet.
 *
 * That is not hypothetical. `--color-muted` already carried a comment here
 * explaining it must live in `@theme`, and five sibling tokens were still left in
 * `:root` — so 25-odd `bg-surface*` / `border-border*` / `text-text` usages
 * across the app were dead, and each affected border silently fell back to
 * Tailwind's default near-black. This suite exists so that cannot recur quietly.
 */

const root = process.cwd();
const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');

/** The `@theme { … }` block, i.e. the tokens Tailwind actually compiles from. */
function themeBlock(source: string): string {
  const start = source.indexOf('@theme');
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

/** Token names (without the leading `--`) declared as colors inside a block. */
function colorTokens(block: string): Set<string> {
  return new Set([...block.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

/** Every `.tsx` under `src/`, as one searchable string. */
function allComponentSource(): string {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.tsx')) files.push(full);
    }
  };
  walk(resolve(root, 'src'));
  return files.map((f) => readFileSync(f, 'utf8')).join('\n');
}

const inTheme = colorTokens(themeBlock(css));
const themeEnd = css.indexOf(themeBlock(css)) + themeBlock(css).length;
// Everything after the @theme block: the hand-written `:root` palette.
const outsideTheme = colorTokens(css.slice(0, css.indexOf('@theme')) + css.slice(themeEnd));

/**
 * Tailwind utility prefixes that read a color token. `border-*` is the subtle
 * one — it doubles as the border-width namespace, which is why `border-border`
 * reads as plausible but still needs the token to be in `@theme`.
 */
const COLOR_UTILITIES = [
  'bg',
  'text',
  'border',
  'border-t',
  'border-b',
  'border-l',
  'border-r',
  'border-x',
  'border-y',
  'ring',
  'fill',
  'stroke',
  'divide',
  'outline',
  'placeholder',
  'shadow',
  'from',
  'via',
  'to',
  'decoration',
  'accent',
  'caret',
];

describe('theme tokens', () => {
  const components = allComponentSource();

  it('declares at least the tokens the app relies on', () => {
    // Guards the extraction itself: if this drifts, every assertion below would
    // pass vacuously by finding no candidates at all.
    for (const token of ['action', 'accent', 'muted', 'surface', 'surface-soft', 'border', 'text']) {
      expect(inTheme, `${token} should be a @theme token`).toContain(token);
    }
  });

  it.each([...outsideTheme])(
    'never uses the :root-only token --color-%s as a Tailwind utility',
    (token) => {
      // Only flag it if the app really writes a utility for it — plenty of
      // `:root` tokens are legitimately `var()`-only.
      const used = COLOR_UTILITIES.some((prefix) =>
        new RegExp(`(^|[\\s"'\`])(${prefix}-${token})(?![a-z0-9-])`, 'm').test(components),
      );
      expect(
        used,
        `--color-${token} is declared in :root, so Tailwind emits no \`*-${token}\` utility. ` +
          `Move it into @theme (or drop the utility) — a :root-only token makes every ` +
          `border fall back to Tailwind's default near-black.`,
      ).toBe(false);
    },
  );

  it('keeps the radius and gradient tokens out of @theme', () => {
    // Promoting these would shadow built-ins: `--radius-sm` redefines
    // `rounded-sm`, and `--color-gradient` claims the `bg-gradient` namespace
    // that `bg-gradient-to-*` needs. They are var()-only by design.
    expect(inTheme.has('gradient')).toBe(false);
    expect(css).toMatch(/--radius-sm:\s*10px/);
  });
});