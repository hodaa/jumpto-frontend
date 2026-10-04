import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useRoute } from '../hooks/useRoute';
import { clearTokenFromAddressBar, readTokenFromLocation } from '../components/auth/token';

/**
 * The emailed links are real paths, not hash routes.
 *
 * The backend builds `<PUBLIC_SITE_URL>/reset-password?token=…` and
 * `/verify-email?token=…`. Three separate things have to agree for those to
 * open anything: the host must serve the app for the path (vercel.json), the
 * router must honour it, and the token reader must find the query. When the
 * rewrite was missing from the deployed site every one of those links returned
 * a bare 404, and no test covered the chain — the router and the token reader
 * each looked correct in isolation.
 */
const EMAILED_PATHS = [
  { path: '/reset-password', route: 'reset-password' },
  { path: '/verify-email', route: 'verify-email' },
] as const;

function setLocation(href: string) {
  window.history.replaceState(null, '', href);
}

afterEach(() => setLocation('/'));

describe('an emailed link opens its own page', () => {
  it.each(EMAILED_PATHS)('routes $path to $route', ({ path, route }) => {
    setLocation(path);
    const { result } = renderHook(() => useRoute());
    expect(result.current).toBe(route);
  });

  it.each(EMAILED_PATHS)('reads the token from the query on $path', ({ path }) => {
    setLocation(`${path}?token=a-real-looking-token`);
    expect(readTokenFromLocation()).toBe('a-real-looking-token');
  });

  it('tolerates a trailing slash, which some mail clients add', () => {
    setLocation('/reset-password/?token=a-real-looking-token');
    const { result } = renderHook(() => useRoute());
    expect(result.current).toBe('reset-password');
    expect(readTokenFromLocation()).toBe('a-real-looking-token');
  });

  it.each(EMAILED_PATHS)('lets an in-app link navigate away from $path', ({ path, route }) => {
    // The regression: the path was read first and unconditionally, so on an
    // emailed link every in-app link was a silent no-op. "Back to sign in" on
    // the reset page produced /reset-password#/login and changed nothing.
    // With clean paths the failure mode is the same in a different shape: a
    // pushState that nothing observes leaves the reset page rendered while the
    // address bar says /login, which is the worst kind of wrong.
    setLocation(path);
    const { result, rerender } = renderHook(() => useRoute());
    expect(result.current).toBe(route);

    act(() => {
      setLocation('/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    rerender();
    expect(result.current).toBe('login');
  });

  it.each(EMAILED_PATHS)('still serves $path itself with no hash at all', ({ path, route }) => {
    // The emailed form has to keep working, including after the token is
    // stripped from the address bar.
    setLocation(`${path}?token=a-real-looking-token`);
    expect(renderHook(() => useRoute()).result.current).toBe(route);
    setLocation(path);
    expect(renderHook(() => useRoute()).result.current).toBe(route);
  });

  it('treats the path as the route and the fragment as only an anchor', () => {
    // The old router let the fragment win, because #/history was how a route was
    // named. Now the path is the route and a fragment only ever addresses an
    // element on the page being rendered — so /reset-password is the reset page
    // whatever the fragment happens to be.
    setLocation('/reset-password#main-content');
    expect(renderHook(() => useRoute()).result.current).toBe('reset-password');
  });

  it('falls back to home for an unknown path with no hash', () => {
    setLocation('/some/unknown/page');
    expect(renderHook(() => useRoute()).result.current).toBe('home');
  });

  it('still resolves a legacy hash link, so an old bookmarked link works', () => {
    // Hash URLs were the site's real addresses, so some are in bookmarks, in
    // people's notes, and in search results. Healing them keeps those working
    // instead of dumping a visitor on the homepage with no explanation.
    setLocation('/#/reset-password?token=a-real-looking-token');
    const { result } = renderHook(() => useRoute());
    expect(result.current).toBe('reset-password');
    expect(readTokenFromLocation()).toBe('a-real-looking-token');
  });

  it('drops the token from the address bar once read', () => {
    // The token is a bearer secret: left in the URL it reaches browser history
    // and screenshots, and the page can be reloaded a second time.
    setLocation('/reset-password?token=a-real-looking-token');
    act(() => clearTokenFromAddressBar());
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/reset-password');
  });
});

describe('the deployment serves the app for those paths', () => {
  const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
    rewrites?: { source: string; destination: string }[];
  };

  it.each(EMAILED_PATHS)('rewrites $path to the app document', ({ path }) => {
    // Without this the host 404s the link outright, which is exactly what a
    // visitor sees and nothing in the bundle can detect.
    const rewrite = vercel.rewrites?.find((entry) => entry.source === path);
    expect(rewrite, `vercel.json has no rewrite for ${path}`).toBeDefined();
    expect(rewrite?.destination).toBe('/index.html');
  });

  it('keeps the API proxy rewrite', () => {
    expect(vercel.rewrites?.some((entry) => entry.source === '/api/:path*')).toBe(true);
  });
});
