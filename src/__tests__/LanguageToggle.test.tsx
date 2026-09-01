import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LanguageToggle } from '../components/LanguageToggle';

describe('LanguageToggle', () => {
  it('starts in English and shows the language selector trigger', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Arabic and back via the dropdown', async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);

    await user.click(screen.getByRole('button', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');

    await user.click(screen.getByRole('button', { name: 'اللغة' }));
    await user.click(screen.getByRole('option', { name: 'English' }));
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('marks the active language with aria-current', async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);

    await user.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('aria-current', 'true');
  });
});
