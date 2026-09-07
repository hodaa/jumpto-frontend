import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import i18n, { setLanguage } from '../i18n';
import englishMessages from '../i18n/locales/en.json';
import { Features } from '../components/Features';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';

describe('Landing sections', () => {
  it.each([
    { language: 'en' as const, heading: 'Why Qfza', nav: 'Why Qfza?' },
    { language: 'ar' as const, heading: 'لماذا قفزة؟', nav: 'لماذا قفزة؟' },
  ])('uses the corrected brand spelling throughout the $language landing page', async ({ language, heading, nav }) => {
    await act(async () => setLanguage(language));
    render(<App />);
    const brand = language === 'ar' ? 'قفزة' : 'Qfza';
    expect(i18n.t('app.title')).toBe(brand);
    expect(screen.getByAltText(language === 'ar' ? 'قفزة' : 'Qfza'))
      .toHaveAttribute('src', language === 'ar' ? '/logo.svg' : '/logo-en.svg?v=icon-left');
    expect(screen.getByRole('link', { name: language === 'ar' ? 'قفزة — الصفحة الرئيسية' : 'Qfza home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: nav })).toBeInTheDocument();
    expect(i18n.t('footer.note')).toContain(brand);
    expect(i18n.t('footer.rights', { year: 2026 })).toContain(brand);
    expect(i18n.t('form.helperDetails')).toContain(brand);
  });

  it('uses only Qfza for brand references in the English messages', () => {
    expect(JSON.stringify(englishMessages)).not.toContain('قفزة');
    expect(englishMessages.app.title).toBe('Qfza');
    expect(englishMessages.nav.whyJumpto).toBe('Why Qfza?');
    expect(englishMessages.form.helperDetails).toMatch(/^Qfza sends/);
  });

  it('keeps browser-tab and description branding in sync with language selection', async () => {
    const description = document.createElement('meta');
    description.name = 'description';
    document.head.appendChild(description);
    try {
      await act(async () => setLanguage('en'));
      expect(document.title).toBe('Qfza — Find the moments that matter');
      expect(description.content).toBe('Qfza — Jump to the moments that matter');

      await act(async () => setLanguage('ar'));
      expect(document.title).toBe('قفزة — Find the moments that matter');
      expect(description.content).toBe('قفزة — Jump to the moments that matter');

      await act(async () => setLanguage('en'));
      expect(document.title).toBe('Qfza — Find the moments that matter');
      expect(description.content).toBe('Qfza — Jump to the moments that matter');
    } finally {
      description.remove();
    }
  });

  it('renders the brand header with the logo and language toggle', () => {
    render(<SiteHeader />);
    expect(screen.getByAltText('Qfza')).toHaveAttribute('src', '/logo-en.svg?v=icon-left');
    expect(screen.getByRole('link', { name: 'Qfza home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Why Qfza?' })).toHaveAttribute('href', '#why-jumpto');
    expect(screen.getByRole('link', { name: 'How it works?' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
  });

  it('switches between English and Arabic logo assets without changing their layout size', async () => {
    render(<SiteHeader />);
    const logo = screen.getByRole('img', { name: 'Qfza' });
    expect(logo).toHaveAttribute('src', '/logo-en.svg?v=icon-left');
    expect(logo).toHaveAttribute('width', '124');
    expect(logo).toHaveAttribute('height', '48');

    await act(async () => setLanguage('ar'));
    expect(screen.getByRole('img', { name: 'قفزة' })).toBe(logo);
    expect(logo).toHaveAttribute('src', '/logo.svg');
    expect(screen.getByRole('link', { name: 'قفزة — الصفحة الرئيسية' })).toHaveAttribute('href', '/');

    await act(async () => setLanguage('en'));
    expect(screen.getByRole('img', { name: 'Qfza' })).toBe(logo);
    expect(logo).toHaveAttribute('src', '/logo-en.svg?v=icon-left');
    expect(logo).toHaveAttribute('width', '124');
    expect(logo).toHaveAttribute('height', '48');
    expect(screen.getByRole('link', { name: 'Qfza home' })).toHaveAttribute('href', '/');
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
      'Paste a YouTube URL, enter a word or phrase, and jump straight to every matching moment.',
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
    expect(screen.getByText('Why Qfza')).toBeInTheDocument();
    expect(screen.getByText('Exact phrase matching')).toBeInTheDocument();
    expect(screen.getByText('Faster repeat searches')).toBeInTheDocument();
    expect(screen.getByText('Watch at the right second')).toBeInTheDocument();
  });

  it('renders the three-step how it works strip', () => {
    render(<HowItWorks />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Paste a YouTube URL')).toBeInTheDocument();
    expect(screen.getByText('Enter a word or phrase')).toBeInTheDocument();
    expect(screen.getByText('Jump to the moment')).toBeInTheDocument();
    for (const step of [1, 2, 3]) {
      expect(screen.getByLabelText(`Step ${step}`)).toHaveClass('bg-accent');
      expect(screen.getByLabelText(`Step ${step}`)).not.toHaveClass('bg-accent-strong');
    }
  });

  it('renders the footer with the current year', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Qfza — Find the moments that matter')).toBeInTheDocument();
    expect(
      screen.getByText(`© ${new Date().getFullYear()} Qfza. All rights reserved.`),
    ).toBeInTheDocument();
  });

  it('composes all landing sections on the idle home page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Why Qfza' })).toBeInTheDocument();
    expect(screen.getByText('Exact phrase matching')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByText('Paste a YouTube URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to the moment' })).toBeInTheDocument();
  });
});
