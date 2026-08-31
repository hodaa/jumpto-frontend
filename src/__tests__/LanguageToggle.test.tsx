import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LanguageToggle } from '../components/LanguageToggle';

describe('LanguageToggle', () => {
  it('starts in English and shows the Arabic label', () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'العربية' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Arabic and back', async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);
    await user.click(screen.getByRole('button', { name: 'العربية' }));
    expect(await screen.findByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('button', { name: 'العربية' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
  });
});
