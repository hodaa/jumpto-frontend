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
    expect(screen.getByAltText('JumpTo')).toHaveAttribute('src', '/logocap.svg');
    expect(screen.getByRole('link', { name: 'JumpTo home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Why JumpTo' })).toHaveAttribute('href', '#why-jumpto');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
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

  it('renders the three feature cards', () => {
    render(<Features />);
    expect(screen.getByText('Why JumpTo')).toBeInTheDocument();
    expect(screen.getByText('Exact phrase matching')).toBeInTheDocument();
    expect(screen.getByText('Instant on repeat searches')).toBeInTheDocument();
    expect(screen.getByText('Watch at the right second')).toBeInTheDocument();
  });

  it('renders the three-step how it works strip', () => {
    render(<HowItWorks />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Paste a link')).toBeInTheDocument();
    expect(screen.getByText('Search a phrase')).toBeInTheDocument();
    expect(screen.getByText('Jump to the moment')).toBeInTheDocument();
  });

  it('renders the footer with the current year', () => {
    render(<SiteFooter />);
    expect(screen.getByText('JumpTo — Find the moments that matter')).toBeInTheDocument();
    expect(
      screen.getByText(`© ${new Date().getFullYear()} JumpTo. All rights reserved.`),
    ).toBeInTheDocument();
  });

  it('composes all landing sections on the idle home page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Why JumpTo' })).toBeInTheDocument();
    expect(screen.getByText('Exact phrase matching')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByText('Paste a link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to the moment' })).toBeInTheDocument();
  });
});
