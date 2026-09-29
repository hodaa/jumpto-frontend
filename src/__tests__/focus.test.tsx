import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { isReadingHelp } from '../utils/focus';

/**
 * isReadingHelp() decides whether a finished search may steal focus. It does
 * that by matching the focused element against section ids that live in
 * Features.tsx and HowItWorks.tsx — different files from the selector itself.
 *
 * Asserting only the selector string would not help: it stays valid-looking
 * after the section is renamed, and the failure is silent (focus jumps away
 * from help the user was reading). So these tests focus the real, rendered
 * sections and assert the guard actually recognises them.
 */
describe('isReadingHelp', () => {
  it('recognises the "Why Qfza?" section and everything inside it', () => {
    render(<App />);
    const section = document.getElementById('why-qfza');
    expect(section, '#why-qfza is not rendered — the selector in focus.ts is stale').not.toBeNull();

    (section as HTMLElement).focus();
    expect(isReadingHelp()).toBe(true);

    // Also true for a descendant, which is what a real click/focus lands on.
    const nested = section!.querySelector('h2, p, a, button') as HTMLElement | null;
    if (nested) {
      nested.focus();
      expect(isReadingHelp()).toBe(true);
    }
  });

  it('recognises the "How it works?" section', () => {
    render(<App />);
    const section = document.getElementById('how-it-works');
    expect(section).not.toBeNull();
    (section as HTMLElement).focus();
    expect(isReadingHelp()).toBe(true);
  });

  it('recognises the header', () => {
    // The <header> itself is not focusable, so the guard works by matching a
    // focusable descendant and walking up — focus a real control inside it.
    render(<App />);
    const control = document.querySelector('header a, header button');
    expect(control, 'header has no focusable control').not.toBeNull();
    (control as HTMLElement).focus();
    expect(document.activeElement).toBe(control);
    expect(isReadingHelp()).toBe(true);
  });

  it('returns false when focus is on the body or an unrelated element', () => {
    render(<App />);
    expect(isReadingHelp()).toBe(false);

    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    (form as HTMLElement).focus();
    expect(isReadingHelp()).toBe(false);
  });
});
