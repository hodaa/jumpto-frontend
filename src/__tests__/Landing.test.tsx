import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { Features } from '../components/Features';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';

describe('Landing sections', () => {
  it('renders the brand header with the logo and language toggle', () => {
    render(<SiteHeader />);
    expect(screen.getByAltText('قفزه')).toHaveAttribute('src', '/logo.svg');
    expect(screen.getByRole('link', { name: 'قفزه home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Why قفزه?' })).toHaveAttribute('href', '#why-jumpto');
    expect(screen.getByRole('link', { name: 'How it works?' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
  });

  it('renders the hero headline with the search card slot', () => {
    render(<Hero>search card</Hero>);
    expect(screen.getByText('Jump to the exact moment a phrase is spoken')).toBeInTheDocument();
    expect(screen.getByText('search card')).toBeInTheDocument();
  });

  it('sets the hero subtitle in the high-contrast muted-strong tone', () => {
    const { container } = render(<Hero compact />);
    const subtitle = container.querySelector('h1 + p');
    expect(subtitle?.textContent).toBe(
      'Paste a video link, enter a word or phrase, and jump straight to every matching moment.',
    );
    expect(subtitle?.className).toContain('text-muted-strong');
    expect(subtitle?.className).not.toContain('text-slate-600');
  });

  it('spreads the header across three zones: logo, nav, language switcher', () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector('header');
    // Balanced three-track grid at sm+ instead of `ms-auto` + space-between,
    // which left one big void between the logo and the nav links.
    expect(header?.className).toContain('sm:grid');
    expect(header?.className).toContain('sm:grid-cols-[1fr_auto_1fr]');
    expect(header?.className).not.toContain('justify-between');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    // Logo → nav → language, and the nav owns the flexible middle track.
    expect(nav.className).toContain('sm:order-2');
    expect(nav.className).toContain('justify-center');
    expect(nav.parentElement?.firstElementChild?.className).toContain('order-1');
  });

  it('renders the three feature cards', () => {
    render(<Features />);
    expect(screen.getByText('Why قفزه')).toBeInTheDocument();
    expect(screen.getByText('Exact phrase matching')).toBeInTheDocument();
    expect(screen.getByText('Instant on repeat searches')).toBeInTheDocument();
    expect(screen.getByText('Watch at the right second')).toBeInTheDocument();
  });

  it('renders the three-step how it works strip', () => {
    render(<HowItWorks />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Paste a video URL')).toBeInTheDocument();
    expect(screen.getByText('Enter a word or phrase')).toBeInTheDocument();
    expect(screen.getByText('Jump to the moment')).toBeInTheDocument();
  });

  it('renders the footer with the current year', () => {
    render(<SiteFooter />);
    expect(screen.getByText('قفزه — Find the moments that matter')).toBeInTheDocument();
    expect(
      screen.getByText(`© ${new Date().getFullYear()} قفزه. All rights reserved.`),
    ).toBeInTheDocument();
  });

  it('composes all landing sections on the idle home page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Why قفزه' })).toBeInTheDocument();
    expect(screen.getByText('Exact phrase matching')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByText('Paste a video URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to the moment' })).toBeInTheDocument();
  });
});
