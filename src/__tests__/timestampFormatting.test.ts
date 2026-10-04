import { describe, expect, it } from 'vitest';
import { formatDay, formatWhen } from '../utils/datetime';

const ISO = '2026-10-03T09:25:00Z';

/**
 * The two callers want different things from one timestamp, and neither of them
 * is a mistake to be unified away.
 *
 * A history row answers "when did I search?", where the time of day is the useful
 * half. The account summary answers "how long have I been here?", which is a
 * duration in days, and a clock reading beside it is noise. These pin both, so
 * a later "simplification" into one shared formatter has to say out loud that it
 * is dropping one of them.
 */
describe('timestamp formatting', () => {
  it('gives a history row the time of day as well as the date', () => {
    const shown = formatWhen(ISO, 'en', 'fallback');
    expect(shown).not.toBe('fallback');
    expect(shown).toMatch(/2026/);
    // The hour is what separates "this morning" from "last Tuesday".
    expect(shown).toMatch(/\d{1,2}:\d{2}/);
  });

  it('gives an account age the date alone', () => {
    const shown = formatDay(ISO, 'en', 'fallback');
    expect(shown).toMatch(/2026/);
    expect(shown).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("reads in the visitor's language rather than US month names", () => {
    // An Arabic account should not have its history stamped in English.
    expect(formatWhen(ISO, 'ar', 'fallback')).not.toBe(formatWhen(ISO, 'en', 'fallback'));
  });

  it('never prints Invalid Date, falling back per caller', () => {
    const broken = 'not-a-date';
    // Each caller picks what a bad value should look like, so the fallback is a
    // parameter rather than a shared guess.
    expect(formatWhen(broken, 'en', 'fallback')).toBe('fallback');
    expect(formatDay(broken, 'en', '')).toBe('');
  });
});
