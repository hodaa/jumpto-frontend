import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * OS metadata filenames that should never reach a deployed site.
 *
 * macOS Finder writes .DS_Store into any directory it visits and Windows
 * Explorer writes Thumbs.db. Vite copies public/ into dist/ verbatim, so an
 * untracked file in public/ becomes a publicly reachable file after a build.
 */
const OS_METADATA = new Set(['.DS_Store', 'Thumbs.db']);

/**
 * Recursively delete OS metadata files under `dir`.
 *
 * Returns the absolute paths removed, deepest-first, so a build can log what it
 * cleaned. Missing or unreadable directories are skipped rather than thrown:
 * this runs against build output, and a cleanup pass must never be the reason
 * a build fails.
 *
 * @param {string} dir Directory to clean.
 * @returns {Promise<string[]>} Absolute paths of the files removed.
 */
export async function removeOsMetadata(dir) {
  const removed = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return removed;
  }
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      removed.push(...(await removeOsMetadata(full)));
    } else if (OS_METADATA.has(entry.name)) {
      await rm(full, { force: true });
      removed.push(full);
    }
  }
  return removed;
}
