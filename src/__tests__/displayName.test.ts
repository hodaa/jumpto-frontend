import { describe, expect, it } from 'vitest';

import { displayName } from '../utils/displayName';

/**
 * The one rule every greeting goes through. The three call sites - account
 * menu, profile heading, history - are single expressions, so this is where the
 * behaviour worth pinning actually lives.
 */
describe('displayName', () => {
  it('prefers the name Google returned', () => {
    expect(displayName({ full_name: 'Hoda Hussin', email: 'hoda@example.com' })).toBe(
      'Hoda Hussin',
    );
  });

  it('falls back to the address when there is no name', () => {
    // A password-only account never has one, so this is its normal case.
    expect(displayName({ full_name: null, email: 'hoda@example.com' })).toBe('hoda@example.com');
  });

  it('falls back to the address when the name is only whitespace', () => {
    // Google can return a profile whose name field is blank rather than absent.
    expect(displayName({ full_name: '   ', email: 'hoda@example.com' })).toBe('hoda@example.com');
  });

  it('trims surrounding whitespace off a real name', () => {
    expect(displayName({ full_name: '  Hoda Hussin ', email: 'hoda@example.com' })).toBe(
      'Hoda Hussin',
    );
  });

  it('keeps internal spacing intact', () => {
    // Trimming must not collapse the space inside a name.
    expect(displayName({ full_name: 'Hoda  Al  Hussin', email: 'hoda@example.com' })).toBe(
      'Hoda  Al  Hussin',
    );
  });

  it('treats a missing field the same as null', () => {
    // Guards an older cached session response that predates full_name.
    const legacy = { email: 'hoda@example.com' } as unknown as {
      full_name: string | null;
      email: string;
    };
    expect(displayName(legacy)).toBe('hoda@example.com');
  });
});
