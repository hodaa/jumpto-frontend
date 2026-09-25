import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { ContactPage } from '../components/ContactPage';
import { CONTACT_EMAIL } from '../config';

describe('ContactPage', () => {
  it('shows the email as a mailto link', () => {
    render(<ContactPage />);
    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument();
    const mail = screen.getByRole('link', { name: CONTACT_EMAIL });
    expect(mail.getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Email us')}`);
    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute('href', '/');
  });

  it('navigates to the contact page from the footer and back home', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: /jump|moment/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Contact us' }));
    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump to the moment' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute('href', '/');
  });
});