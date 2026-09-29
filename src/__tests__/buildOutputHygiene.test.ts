import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { removeOsMetadata } from '../../scripts/lib/osMetadata.mjs';

/**
 * Vite copies public/ into dist/ verbatim, so any file in public/ that is not
 * meant to be served becomes a real, publicly reachable file after a build. macOS
 * Finder writes .DS_Store unprompted and Windows Explorer writes Thumbs.db.
 *
 * scripts/lib/osMetadata.mjs scrubs both from dist after the copy. These tests
 * exercise the scrubber on a real directory tree, because a source-text grep
 * cannot tell whether it recurses — the same `readdir({ withFileTypes: true })`
 * and `isDirectory()` calls appear in unrelated code nearby, so such a check
 * passes even when the scrubber walks nothing.
 */

const OS_METADATA = ['.DS_Store', 'Thumbs.db'];
const root = process.cwd();

/** Relative paths of OS metadata files under `dir`, or [] if none. */
function findOsMetadata(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return findOsMetadata(full);
    return OS_METADATA.includes(entry.name) ? [full.slice(dir.length + 1)] : [];
  });
}

let tree: string;

beforeEach(() => {
  tree = mkdtempSync(resolve(tmpdir(), 'osmeta-'));
  // Junk at the root and nested two levels down, plus files that must survive.
  mkdirSync(resolve(tree, 'assets/img'), { recursive: true });
  for (const dir of [tree, resolve(tree, 'assets'), resolve(tree, 'assets/img')]) {
    writeFileSync(resolve(dir, '.DS_Store'), 'junk');
  }
  writeFileSync(resolve(tree, 'Thumbs.db'), 'junk');
  writeFileSync(resolve(tree, 'index.html'), '<!doctype html>');
  writeFileSync(resolve(tree, 'assets/app.js'), 'console.log(1)');
  // A file that merely starts with the same prefix must not be removed.
  writeFileSync(resolve(tree, 'assets/.DS_Store_backup'), 'keep me');
});

afterEach(() => {
  if (existsSync(tree)) execFileSync('rm', ['-rf', tree]);
});

describe('removeOsMetadata', () => {
  it('removes junk from the root and every nested directory', async () => {
    const removed = await removeOsMetadata(tree);
    expect(findOsMetadata(tree)).toEqual([]);
    // Recursion is the point: a root-only scrub leaves nested junk behind.
    expect(removed.filter((p) => p.endsWith('/.DS_Store'))).toHaveLength(3);
    expect(removed.filter((p) => p.endsWith('/Thumbs.db'))).toHaveLength(1);
  });

  it('leaves real assets and near-miss filenames alone', async () => {
    await removeOsMetadata(tree);
    expect(existsSync(resolve(tree, 'index.html'))).toBe(true);
    expect(existsSync(resolve(tree, 'assets/app.js'))).toBe(true);
    expect(existsSync(resolve(tree, 'assets/.DS_Store_backup'))).toBe(true);
  });

  it('is a no-op on a clean tree', async () => {
    execFileSync('rm', ['-rf', tree]);
    mkdirSync(resolve(tree, 'a/b'), { recursive: true });
    writeFileSync(resolve(tree, 'a/b/keep.txt'), 'x');
    await expect(removeOsMetadata(tree)).resolves.toEqual([]);
    expect(existsSync(resolve(tree, 'a/b/keep.txt'))).toBe(true);
  });

  // Cleanup must never be the reason a build fails.
  it('tolerates a missing or unreadable directory', async () => {
    await expect(removeOsMetadata(resolve(tree, 'does-not-exist'))).resolves.toEqual([]);
  });
});

describe('OS metadata in sources that get copied', () => {
  it('is invoked by prerender against dist', () => {
    // The module's behaviour is covered above, but only a caller can guarantee
    // it runs during a build. prerender.mjs executes file writes at import
    // time, so it cannot be imported here — assert the wiring instead. The
    // check is deliberately specific to the dist call: a broad pattern for
    // "some recursion happens" also matches the unrelated sitemap code.
    const source = readFileSync(resolve(root, 'scripts/prerender.mjs'), 'utf8');
    expect(source).toMatch(/removeOsMetadata\s*\(\s*dist\s*\)/);
  });

  it('has no OS metadata under public/, the directory Vite copies', () => {
    expect(findOsMetadata(resolve(root, 'public'))).toEqual([]);
  });

  it('never tracks OS metadata in git', () => {
    let tracked: string[];
    try {
      tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
        .split('\n')
        .filter((line) => line && OS_METADATA.some((name) => line.endsWith(name)));
    } catch {
      return; // No git (e.g. a tarball export); the file-system checks still run.
    }
    expect(tracked).toEqual([]);
  });
});

const distExists = existsSync(resolve(root, 'dist'));

describe.skipIf(!distExists)('existing dist', () => {
  it('contains no OS metadata', () => {
    expect(findOsMetadata(resolve(root, 'dist'))).toEqual([]);
  });

  it('is still a complete build, so the scrub did not empty it', () => {
    // A scrubber that wiped dist would pass the check above; this pins the
    // files that must survive it.
    for (const file of ['index.html', 'sitemap.xml', 'robots.txt', 'blog-manifest.json']) {
      const full = resolve(root, 'dist', file);
      expect(existsSync(full), `dist/${file} is missing`).toBe(true);
      expect(statSync(full).size).toBeGreaterThan(0);
    }
  });
});
