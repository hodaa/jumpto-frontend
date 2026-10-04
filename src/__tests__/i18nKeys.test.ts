import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import englishMessages from '../i18n/locales/en.json';
import arabicMessages from '../i18n/locales/ar.json';


const root = process.cwd();

type Json = { [key: string]: string | Json };

/** i18next plural suffixes; t('a.b', {count}) resolves to one of these. */
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];

function resolvePath(source: Json, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((node, segment) => {
    if (node && typeof node === 'object' && segment in (node as Json)) {
      return (node as Json)[segment];
    }
    return undefined;
  }, source);
}

/**
 * A key is satisfied by its own value, or — for a counted call like
 * t('results.matchCount', { count }) — by any of its plural variants. The base
 * key legitimately does not exist on its own.
 */
function keyExists(messages: Json, dotted: string): boolean {
  if (resolvePath(messages, dotted) !== undefined) return true;
  return PLURAL_SUFFIXES.some(
    (suffix) => resolvePath(messages, `${dotted}_${suffix}`) !== undefined,
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) ? [full] : [];
  });
}

// t('key'), t("key"), i18n.t('key') — with optional leading whitespace.
const CALL_SITE = /\bt\(\s*'([a-zA-Z][\w.]*)'|\bt\(\s*"([a-zA-Z][\w.]*)"/g;

const callSites = (): { file: string; key: string }[] =>
  sourceFiles(resolve(root, 'src'))
    // Skip test files: they assert on keys by string literal, and a key
    // mentioned in a test is not a call site.
    .filter((file) => !/[\\/]__tests__[\\/]/.test(file) && !/\.test\.(ts|tsx)$/.test(file))
    .flatMap((file) => {
      const raw = readFileSync(file, 'utf8');
      return [...raw.matchAll(CALL_SITE)].map((match) => ({
        file: file.slice(root.length + 1),
        key: match[1] ?? match[2],
      }));
    });

describe('i18n key integrity', () => {
  it('finds call sites to check', () => {
    // Guard the guard: a regex that silently matches nothing would leave every
    // assertion below vacuously true.
    expect(callSites().length).toBeGreaterThan(20);
  });

  it('resolves every t() call site in both locales', () => {
    const missing: string[] = [];
    for (const { file, key } of callSites()) {
      for (const [locale, messages] of [
        ['en', englishMessages],
        ['ar', arabicMessages],
      ] as const) {
        if (!keyExists(messages as Json, key)) {
          missing.push(`${file}: ${key} is absent from ${locale}.json`);
        }
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('keeps the two locale files structurally identical', () => {
    // Catches the inverse error: a key added to one locale only.
    //
    // Plural variants are normalised to their base key first, because the
    // categories legitimately differ: Arabic needs zero/one/two/few/many/other
    // where English only needs one/other. Comparing raw leaves would report
    // every Arabic plural form as a spurious extra key.
    const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');
    const shape = (value: Json, prefix = ''): Set<string> => {
      const paths = new Set<string>();
      const visit = (node: Json, at: string) => {
        for (const [key, child] of Object.entries(node)) {
          const path = at ? `${at}.${key}` : key;
          if (child && typeof child === 'object') visit(child, path);
          else paths.add(base(path));
        }
      };
      visit(value, prefix);
      return paths;
    };
    const en = shape(englishMessages as Json);
    const ar = shape(arabicMessages as Json);
    expect([...en].filter((key) => !ar.has(key)).sort(), 'keys only in en.json').toEqual([]);
    expect([...ar].filter((key) => !en.has(key)).sort(), 'keys only in ar.json').toEqual([]);
  });

  it('leaves no empty translation that would render as a blank', () => {
    const blank: string[] = [];
    const visit = (value: Json, prefix = '') => {
      for (const [key, child] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (child && typeof child === 'object') visit(child, path);
        else if (typeof child === 'string' && !child.trim()) blank.push(path);
      }
    };
    visit(englishMessages as Json);
    visit(arabicMessages as Json);
    expect(blank, `blank translations: ${blank.join(', ')}`).toEqual([]);
  });
});
