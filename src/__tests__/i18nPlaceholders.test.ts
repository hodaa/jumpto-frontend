import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ar from '../i18n/locales/ar.json';
import en from '../i18n/locales/en.json';

/**
 * Placeholders are i18next's `{{name}}`, not `{name}`.
 *
 * A single-brace placeholder is not a broken placeholder, it is ordinary text:
 * i18next leaves it alone and the visitor reads the literal braces. Nothing
 * else detects it - the string is valid JSON, the call site passes the value
 * correctly, the page renders - so it is checked here instead.
 */
const SINGLE_BRACE = /(?<!\{)\{[a-zA-Z_][a-zA-Z0-9_]*\}(?!\})/;

/** `t('path', { name })` - the `t` must not be the tail of another call. */
const INTERPOLATED = /(?<![A-Za-z0-9_$])t\(\s*'([a-zA-Z0-9_.]+)'\s*,\s*\{([^}]*)\}/g;

const LOCALES: Record<string, unknown> = { ar, en };

function walk(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === 'string') {
    out.push([path, value]);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walk(child, path ? `${path}.${key}` : key, out);
    }
  }
}

function localeStrings(): [string, string][] {
  const out: [string, string][] = [];
  walk(ar, '', out);
  walk(en, '', out);
  return out;
}

/** Every `t('path', { a, b })` call site in the source. */
function interpolationCallSites(): { path: string; vars: string[] }[] {
  const root = join(process.cwd(), 'src');
  const found: { path: string; vars: string[] }[] = [];

  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'locales' || entry === '__tests__') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        visit(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      for (const match of readFileSync(full, 'utf8').matchAll(INTERPOLATED)) {
        const vars = match[2]
          .split(',')
          .filter((part) => part.includes('='))
          .map((part) => part.split(':')[0].trim())
          .filter(Boolean);
        found.push({ path: match[1], vars });
      }
    }
  };
  visit(root);
  return found;
}

/** Resolve a dotted path, tolerating i18next plural suffixes. */
function lookup(bundle: unknown, path: string): string | undefined {
  let current: unknown = bundle;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    const node = current as Record<string, unknown>;
    if (part in node) {
      current = node[part];
      continue;
    }
    const plural = Object.keys(node).find((key) => key.startsWith(`${part}_`));
    if (plural === undefined) return undefined;
    current = node[plural];
  }
  return typeof current === 'string' ? current : undefined;
}

describe('locale placeholders', () => {
  const strings = localeStrings();

  it('never uses single-brace placeholders, in either language', () => {
    // Regression: the set-password confirmation read
    // "أرسلنا رابطًا إلى {email}. افتحه للإكمال." on screen, in both languages.
    const offenders = strings.filter(([, text]) => SINGLE_BRACE.test(text));
    expect(offenders.map(([path, text]) => `${path}: ${text}`)).toEqual([]);
  });

  it('declares every value passed at an interpolation call site', () => {
    // A `{{name}}` the string does not declare renders as nothing, so the
    // sentence quietly loses a word rather than reporting a missing value.
    const problems: string[] = [];
    for (const site of interpolationCallSites()) {
      for (const [name, bundle] of Object.entries(LOCALES)) {
        const text = lookup(bundle, site.path);
        if (text === undefined) continue; // A key this test does not model.
        for (const variable of site.vars) {
          if (!text.includes(`{{${variable}}}`)) {
            problems.push(
              `${name}: ${site.path} is given ${variable} but does not use {{${variable}}}`,
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('the set-password confirmation', () => {
  it('shows the real address instead of the placeholder', () => {
    const expected = 'someone@example.com';
    for (const [name, bundle] of Object.entries(LOCALES)) {
      const text = lookup(bundle, 'auth.profile.linkSent');
      expect(text, name).toBeDefined();
      const output = text!.replace('{{email}}', expected);
      expect(output, name).toContain(expected);
      expect(output, name).not.toContain('{{');
      expect(output, name).not.toContain('{email}');
    }
  });
});
