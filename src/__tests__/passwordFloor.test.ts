import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN_LENGTH, validatePassword } from '../components/auth/formHooks';
import ar from '../i18n/locales/ar.json';
import en from '../i18n/locales/en.json';

/**
 * The password floor has to be the same number in both repos.
 *
 * The client used to accept 8 characters while the API demanded 10. Nothing
 * failed at build or boot: an 8- or 9-character password was submitted, the API
 * answered 422, and the visitor was told to try again later. A comment in
 * `formHooks.ts` even claimed the check mirrored the backend, which is exactly
 * the kind of claim that rots because nothing verifies it.
 */
const BACKEND_SCHEMA = join(
  process.cwd(),
  '..',
  '..',
  'python',
  'qfza-backend',
  'app',
  'schemas',
  'auth.py',
);

/** Password fields the API validates against a minimum. */
const API_PASSWORD_FIELDS = ['RegisterRequest', 'PasswordResetConfirmRequest'] as const;

describe('the client password floor matches the API', () => {
  const schemaExists = existsSync(BACKEND_SCHEMA);
  const schema = schemaExists ? readFileSync(BACKEND_SCHEMA, 'utf8') : '';

  // Skipped rather than failed when the backend is not checked out beside this
  // one, so the frontend suite still runs on its own.
  /** The password min_length declared inside one request class. */
  const floorIn = (className: string): number | null => {
    const body = schema.slice(schema.indexOf(`class ${className}`));
    if (!body.startsWith(`class ${className}`)) return null;
    const match = body
      .slice(0, body.indexOf('\nclass '))
      .match(/password: str = Field\(\.\.\., min_length=(\d+)/);
    return match ? Number(match[1]) : null;
  };

  it.runIf(schemaExists)('equals the min_length the API enforces', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    for (const name of API_PASSWORD_FIELDS) {
      const floor = floorIn(name);
      expect(floor, `${name} declares no password min_length`).not.toBeNull();
      // The regression: the client accepted 8 and 9, which the API refuses.
      expect(floor, `${name}: the client accepts a password the API will reject`).toBe(
        PASSWORD_MIN_LENGTH,
      );
    }
  });

  it.runIf(schemaExists)('still lets a too-short login through, since login has no policy', () => {
    // LoginRequest is min_length=1 on purpose: refusing to even try would leak
    // that an address exists, and would lock out anyone whose old password
    // predates the current floor.
    expect(schema).toMatch(/password: str = Field\(\.\.\., min_length=1, max_length=128\)/);
  });

  it.each(API_PASSWORD_FIELDS)('covers the %s body', (name) => {
    expect(schema).toContain(`class ${name}`);
  });
});

describe('validatePassword', () => {
  it('rejects an empty password as required, not as too short', () => {
    expect(validatePassword('')).toBe('required');
  });

  it('rejects one character below the floor', () => {
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe('tooShort');
  });

  it('accepts exactly the floor', () => {
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it('never accepted the lengths the API refuses', () => {
    // The regression itself: 8 and 9 passed here and failed at the API.
    for (const length of [8, 9]) {
      expect(validatePassword('a'.repeat(length)), `${length} characters`).not.toBeNull();
    }
  });
});

describe('the stated floor matches the enforced one', () => {
  it.each([
    ['en', en],
    ['ar', ar],
  ])('tells the %s visitor the real number', (_name, bundle) => {
    const ten = ['10', '١٠', 'ten', 'عشرة'];
    const eight = ['at least 8', 'ثمانية'];
    for (const key of ['hint'] as const) {
      const text = bundle.auth.password[key];
      expect(
        ten.some((form) => text.includes(form)),
        `${key}: ${text}`,
      ).toBe(true);
      expect(
        eight.some((form) => text.includes(form)),
        `${key}: ${text}`,
      ).toBe(false);
    }
    const tooShort = bundle.auth.passwordError.tooShort;
    expect(
      ten.some((form) => tooShort.includes(form)),
      tooShort,
    ).toBe(true);
    expect(
      eight.some((form) => tooShort.includes(form)),
      tooShort,
    ).toBe(false);
  });
});
