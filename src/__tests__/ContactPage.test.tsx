import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { ContactPage } from '../components/ContactPage';
import { CONTACT_EMAIL } from '../config';

// example.com is the reserved documentation domain used by the form placeholders
// and fixtures; the site's own domain is the only other one allowed to ship.
const ALLOWED_EMAIL_DOMAINS = new Set(['qfza.app', 'example.com']);
const EMAIL_PATTERN = /[\w.+-]+@([\w-]+\.[\w.-]+)/g;

describe('ContactPage', () => {
  it('shows the email as a mailto link', () => {
    render(<ContactPage />);
    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument();
    const mail = screen.getByRole('link', { name: CONTACT_EMAIL });
    expect(mail.getAttribute('href')).toBe(
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Email us')}`,
    );
    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute('href', '/');
  });

  it('keeps personal addresses out of the shipped contact details', () => {
    // The contact address is a public, crawlable, indexable string. It is
    // deliberately asserted by domain rather than by value so this guard never
    // embeds the address it is guarding against.
    for (const file of ['src/config.ts', '.env.example']) {
      const raw = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const [, domain] of raw.matchAll(EMAIL_PATTERN)) {
        expect(ALLOWED_EMAIL_DOMAINS.has(domain), `${file} contains an address on ${domain}`).toBe(
          true,
        );
      }
    }

    // And the address the page actually renders is on the site's own domain.
    render(<ContactPage />);
    const [, shown] = /[\w.+-]+@([\w-]+\.[\w.-]+)/.exec(CONTACT_EMAIL) ?? [];
    expect(shown, `rendered contact address has no domain: "${CONTACT_EMAIL}"`).toBeDefined();
    expect(ALLOWED_EMAIL_DOMAINS.has(shown!)).toBe(true);
  });

  it('reaches the contact page from the footer by its own path', () => {
    // Contact is a generated document as well as a client route, so the footer
    // points at the real path instead of routing in-app. That is the whole point
    // of the hybrid page: /contact/ has to be a URL a crawler and a visitor
    // without JS can both open, which a hash route can never be.
    render(<App />);
    expect(screen.getByRole('heading', { name: /jump|moment/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact/');
  });

  it('renders the contact view when loaded directly at /contact/', () => {
    // Landing on it — a reload, a shared link, or the crawler's fetch — has to
    // render the contact view rather than the homepage shell again. This is the
    // path a visitor takes from the hybrid static document, so it is the one that
    // decides whether the page works at all.
    window.history.pushState(null, '', '/contact/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump to the moment' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute('href', '/');
  });
});
