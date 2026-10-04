import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteFooter } from '../components/SiteFooter';
import i18n from '../i18n';

describe('SiteFooter blog link', () => {
  it('links to the English blog index', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog/');
  });

  it('points at the Arabic blog index when the UI language is Arabic', () => {
    const previous = i18n.language;
    i18n.changeLanguage('ar');
    try {
      render(<SiteFooter />);
      expect(screen.getByRole('link', { name: 'المدونة' })).toHaveAttribute('href', '/ar/blog/');
    } finally {
      i18n.changeLanguage(previous);
    }
  });
});
