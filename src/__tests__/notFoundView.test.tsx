import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { setLanguage } from '../i18n';
import { useRoute } from '../hooks/useRoute';

/**
 * The in-app 404 — what an unknown path renders.
 *
 * Production never boots the app for these URLs: the host answers them with the
 * static 404 document (scripts/lib/notfound.mjs). The dev server falls back to
 * the app for every path, though, and it used to render the homepage there — a
 * 200 at a stranger's address, which is exactly the soft 404 the static
 * document exists to avoid. These tests pin the view, its head, and the fact
 * that a real route still wins.
 */

const at = (path: string) => {
  window.history.replaceState(null, '', path);
  return render(<App />);
};

/**
 * Clear the tags the hook manages, so each test starts from the same head.
 *
 * Only one page is ever loaded at a time in production, so the hook rewrites a
 * single tag in place. Here every test shares one document: a canonical left
 * behind by an earlier test would sit in front of this one's, and removing
 * "the" canonical would remove the wrong element and pass a broken fix.
 */
function resetHead(): void {
  for (const selector of [
    'link[rel="canonical"]',
    'meta[property="og:url"]',
    'meta[name="robots"]',
    'meta[name="description"]',
  ]) {
    document.querySelectorAll(selector).forEach((tag) => tag.remove());
  }
}

afterEach(() => {
  resetHead();
  window.history.replaceState(null, '', '/');
});

describe('useRoute for unowned paths', () => {
  it.each([
    '/some/unknown/page',
    '/some/unknown/page/',
    '/ar/unknown',
    // The bare Arabic homepage prefix: dist/ar/index.html is deliberately
    // absent, and production answers both spellings with the 404 document.
    '/ar',
    '/ar/',
  ])('resolves %s to the not-found view', (path) => {
    window.history.replaceState(null, '', path);
    expect(renderHook(() => useRoute()).result.current).toBe('not-found');
  });
});

describe('the not-found view', () => {
  const region = () => screen.getByRole('region', { name: 'We could not find that page' });

  it('renders for an unknown path instead of the homepage', () => {
    const { unmount } = at('/some/unknown/page');
    expect(region()).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    // The search form must not be here: answering a mistyped URL with a working
    // search box reads as "this page exists".
    expect(screen.queryByLabelText('YouTube URL')).not.toBeInTheDocument();
    expect(document.title).toBe('Page not found — Qfza');
    unmount();
  });

  it('still renders a real route, so not-found stays the fallback', () => {
    const { unmount } = at('/login');
    expect(screen.queryByRole('region', { name: 'We could not find that page' })).toBeNull();
    unmount();
  });

  it('noindexes itself and drops the homepage canonical', () => {
    // index.html ships the homepage's canonical and og:url. Left in place they
    // would tell a crawler the homepage lives at the mistyped address.
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://qfza.app/';
    document.head.appendChild(canonical);
    const ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    ogUrl.setAttribute('content', 'https://qfza.app/');
    document.head.appendChild(ogUrl);

    const { unmount } = at('/some/unknown/page');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, follow',
    );
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'This page does not exist. Search inside any YouTube video on Qfza.',
    );
    unmount();
  });

  it('soft-navigates back to the search, so the way out is one click', async () => {
    const { unmount } = at('/some/unknown/page');
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Back to the search' }));
    expect(window.location.pathname).toBe('/');
    expect(await screen.findByLabelText('YouTube URL')).toBeInTheDocument();
    unmount();
  });

  it('follows the UI language, including the static links it carries', async () => {
    const { unmount } = at('/some/unknown/page');
    // Scoped to the view: the footer carries the same "Blog" and "Privacy"
    // labels, and a bare query would match both.
    expect(within(region()).getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog/');

    await act(async () => setLanguage('ar'));

    const arabic = screen.getByRole('region', { name: 'لم نعثر على هذه الصفحة' });
    // A generated page is a separate document per locale, so the link crosses
    // into /ar rather than relying on the app to retranslate a page it does
    // not own.
    expect(within(arabic).getByRole('link', { name: 'المدونة' })).toHaveAttribute(
      'href',
      '/ar/blog/',
    );
    expect(within(arabic).getByRole('link', { name: 'الخصوصية' })).toHaveAttribute(
      'href',
      '/ar/privacy/',
    );
    expect(document.title).toBe('الصفحة غير موجودة — قفزة');
    unmount();
  });
});
