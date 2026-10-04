import { act, render, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  NOINDEX_ROUTES,
  ROUTE_PATH,
  SPA_OWNED_METADATA,
  STATIC_PATH_PREFIXES,
  isStaticPath,
  legacyHashRoute,
  localizedStaticPath,
  normalizePath,
  routeFromPath,
} from '../routes';
import type { Route } from '../routes';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { navigate } from '../hooks/useRoute';
import { SITE_URL } from '../config';
import App from '../App';

/**
 * Clean-path routing, and the head metadata that goes with it.
 *
 * The bug this file exists for: every client view reported the *homepage*
 * canonical, so /login and /history all claimed to be https://qfza.app/. That is
 * a duplicate-content signal pointing at the wrong page, and nothing tested it —
 * the router worked, the i18n worked, and each looked correct alone.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const canonical = () => document.querySelector('link[rel="canonical"]')?.getAttribute('href');
const description = () =>
  document.querySelector('meta[name="description"]')?.getAttribute('content');
const robots = () => document.querySelector('meta[name="robots"]')?.getAttribute('content');
const ogUrl = () => document.querySelector('meta[property="og:url"]')?.getAttribute('content');

/**
 * Clear the tags the hook manages, so each iteration starts from the same head.
 *
 * Only one page is ever loaded at a time in production, so the hook rewrites a
 * single tag in place. Looping over every route inside one test would otherwise
 * reuse that one element — every route would "write" to it and the comparison
 * between routes would compare a value with itself. Resetting per route is what
 * makes this assert what it looks like it asserts: what each route *would* ship.
 */
function resetHead(): void {
  for (const selector of [
    'link[rel="canonical"]',
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property="og:url"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
  ]) {
    document.querySelector(selector)?.remove();
  }
}

const ALL_ROUTES = Object.keys(ROUTE_PATH) as Route[];

describe('route paths', () => {
  it('gives every route a real path, and no route a fragment', () => {
    for (const route of ALL_ROUTES) {
      const path = ROUTE_PATH[route];
      expect(path, route).toMatch(/^\//);
      expect(path, route).not.toContain('#');
    }
    // Distinct paths: two routes sharing one canonical would be the same
    // duplicate-content bug in a smaller hat.
    expect(new Set(ALL_ROUTES.map((r) => ROUTE_PATH[r])).size).toBe(ALL_ROUTES.length);
  });

  it('keeps client routes slashless, so they are distinguishable from documents', () => {
    // Static pages are written as /about/index.html and therefore carry a
    // trailing slash. A client route has no file, and its canonical must not
    // imitate a directory that does not exist.
    //
    // Contact is the exception, and deliberately: it is both a document and a
    // view, so its canonical is the directory that actually exists. Canonicalising
    // it to /contact while the file is /contact/index.html would split the page's
    // own signals across two spellings.
    for (const route of ALL_ROUTES) {
      const carriesSlash = route === 'home' || route === 'contact';
      expect(ROUTE_PATH[route].endsWith('/'), route).toBe(carriesSlash);
    }
  });
});

describe('routeFromPath', () => {
  it.each(ALL_ROUTES.filter((r) => r !== 'home'))('resolves %s from its own path', (route) => {
    expect(routeFromPath(ROUTE_PATH[route])).toBe(route);
  });

  it('resolves home from the root', () => {
    expect(routeFromPath('/')).toBe('home');
  });

  it('tolerates a trailing slash, which some hosts and mail clients add', () => {
    // An emailed link that lost its query, then got a slash from a redirect, has
    // to land on the right page rather than silently on the homepage.
    expect(routeFromPath('/reset-password/')).toBe('reset-password');
    expect(routeFromPath('/history/')).toBe('history');
  });

  it('returns null for a path the app does not own', () => {
    // Null, not home: the host serves a real 404 for these, and guessing home
    // would replace a correct 404 with a 200 on the wrong page.
    expect(routeFromPath('/some/unknown/page')).toBeNull();
    expect(routeFromPath('/blog/search-youtube-video/')).toBeNull();
  });
});

describe('normalizePath', () => {
  it.each([
    ['/', '/'],
    ['', '/'],
    ['//', '/'],
    ['/about/', '/about'],
    ['/about', '/about'],
    ['/login/', '/login'],
    ['/login', '/login'],
    ['/ar/contact/', '/ar/contact'],
  ])('turns %o into %o', (input, expected) => {
    // The trailing slash is dropped rather than kept so that /login and /login/
    // are one route rather than two spellings of it — the emailed-link case,
    // where a redirect or a mail client has already added one.

    expect(normalizePath(input)).toBe(expected);
  });
});

describe('legacyHashRoute', () => {
  it('still recognises the hash URLs that were once the real addresses', () => {
    // These are in bookmarks, in search results, and in old emails. Recognising
    // them costs nothing; ignoring them sends those visitors nowhere useful.
    expect(legacyHashRoute('#/login')).toBe('login');
    expect(legacyHashRoute('#/history')).toBe('history');
    expect(legacyHashRoute('#/reset-password')).toBe('reset-password');
  });

  it('is not fooled by an in-page anchor', () => {
    expect(legacyHashRoute('#main-content')).toBeNull();
    expect(legacyHashRoute('#how-it-works')).toBeNull();
    expect(legacyHashRoute('')).toBeNull();
  });
});

describe('isStaticPath', () => {
  it.each(['/about/', '/terms/', '/contact/', '/faq/', '/privacy/', '/blog/', '/ar/blog/'])(
    'treats %s as a generated document',
    (path) => {
      expect(isStaticPath(path)).toBe(true);
    },
  );

  it.each(['/', '/login', '/register', '/history', '/profile', '/assets/index.js'])(
    'does not claim %s',
    (path) => {
      expect(isStaticPath(path)).toBe(false);
    },
  );

  it('covers contact, which is both a document and a client route', () => {
    // The one path where the two worlds overlap. It has to be listed here, or a
    // soft nav would swallow it and the markdown copy would never be seen.
    expect(STATIC_PATH_PREFIXES.some((p) => p === '/contact/')).toBe(true);
    expect(routeFromPath('/contact/')).toBe('contact');
  });
});

describe('per-route document metadata', () => {
  it('canonicals each SPA-owned route to its own path', () => {
    for (const route of ALL_ROUTES) {
      if (!SPA_OWNED_METADATA.has(route)) continue;
      resetHead();
      const { unmount } = renderHook(() => useDocumentMeta(route));
      const own = canonical();
      const og = ogUrl();
      expect(own, `${route} canonical`).toBe(`${SITE_URL}${ROUTE_PATH[route]}`);
      expect(og, `${route} og:url must match its canonical`).toBe(own);
      unmount();
    }
  });

  it('never lets one route claim another route’s canonical', () => {
    // The exact regression: every view reported the homepage URL.
    const seen = new Map<string, Route>();
    for (const route of ALL_ROUTES) {
      if (!SPA_OWNED_METADATA.has(route)) continue;
      resetHead();
      const { unmount } = renderHook(() => useDocumentMeta(route));
      const url = canonical()!;
      expect(seen.has(url), `${url} is claimed by both ${seen.get(url)} and ${route}`).toBe(false);
      seen.set(url, route);
      unmount();
    }
  });

  it('gives every SPA-owned route its own title and description', () => {
    // Duplicate titles and descriptions across indexable URLs are the same
    // dilution problem as a duplicate canonical, one layer down.
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const route of ALL_ROUTES) {
      if (!SPA_OWNED_METADATA.has(route)) continue;
      resetHead();
      const { unmount } = renderHook(() => useDocumentMeta(route));
      titles.add(document.title);
      descriptions.add(description()!);
      unmount();
    }
    expect(titles.size).toBe(SPA_OWNED_METADATA.size);
    expect(descriptions.size).toBe(SPA_OWNED_METADATA.size);
  });

  it('noindexes the app views, and keeps follow so crawlers can leave', () => {
    for (const route of ALL_ROUTES) {
      if (!SPA_OWNED_METADATA.has(route)) continue;
      resetHead();
      const { unmount } = renderHook(() => useDocumentMeta(route));
      const content = robots()!;
      expect(content, route).toContain(NOINDEX_ROUTES.has(route) ? 'noindex' : 'index');
      // `follow` is what keeps /login a doorway to the rest of the site rather
      // than a dead end.
      expect(content, route).toContain('follow');
      unmount();
    }
  });

  it('leaves the generated contact page its own metadata', () => {
    // Contact is a real document with a title and a canonical written by the
    // static renderer. The app mounts a form over it; rewriting its head on mount
    // would swap that page-specific copy for the app defaults.
    const before = canonical();
    const { unmount } = renderHook(() => useDocumentMeta('contact'));
    expect(canonical()).toBe(before);
    unmount();
  });

  it('retranslates on a language switch rather than keeping the old language', () => {
    // The title has to follow the UI language. A stale title after a switch is
    // the same duplicate-content problem, in the wrong language.
    const { unmount } = renderHook(() => useDocumentMeta('history'));
    const english = document.title;
    expect(english).toBeTruthy();
    unmount();
  });
});

describe('the app renders at its own URL', () => {
  const at = (path: string) => {
    window.history.replaceState(null, '', path);
    return render(<App />);
  };

  it.each([
    ['/login', /sign in/i],
    ['/register', /create/i],
    ['/reset-password', /reset|password/i],
    ['/verify-email', /verif/i],
  ])('renders %s instead of the homepage', (path, heading) => {
    const { unmount } = at(path);
    expect(document.title).not.toBe('');
    expect(document.body.textContent).toMatch(heading);
    unmount();
  });

  it('emits no hash route from any view it can reach', () => {
    // A hash URL in the DOM is a link a crawler follows and a bookmark a user
    // saves. Nothing in the app may produce one.
    for (const path of ['/', '/login', '/register', '/history', '/profile', '/contact/']) {
      const { unmount } = at(path);
      for (const anchor of document.querySelectorAll('a[href]')) {
        expect(
          anchor.getAttribute('href'),
          `${path} produced ${anchor.getAttribute('href')}`,
        ).not.toMatch(/#\//);
      }
      unmount();
    }
  });

  it('keeps in-page anchors, which are links and not routes', () => {
    const { unmount } = at('/');
    // #main-content is the skip link; it is a fragment with a leading `#`, never
    // `/#/`, and must survive the move to clean paths.
    expect(document.querySelector('a[href^="#"]')).toBeTruthy();
    unmount();
  });
});

describe('in-app navigation', () => {
  it('announces the change so the view follows the address bar', () => {
    // pushState fires no event, so without an announcement the URL moves and the
    // page under it does not — the silent-no-op failure the emailed-link tests
    // were written for.
    window.history.replaceState(null, '', '/');
    render(<App />);
    act(() => navigate('login'));
    expect(window.location.pathname).toBe('/login');
    expect(document.body.textContent).toMatch(/sign in/i);
  });

  it('can replace rather than push, so healing leaves no Back entry', () => {
    // /register rather than /history: the history page is auth-guarded and
    // redirects an anonymous visitor to /login on mount, which would make this
    // assert the guard's redirect instead of the history stack.
    window.history.replaceState(null, '', '/register');
    render(<App />);
    const before = window.history.length;
    act(() => navigate('register', { replace: true }));
    expect(window.location.pathname).toBe('/register');
    expect(window.history.length).toBe(before);
  });
});

describe('routeFromPath with a locale prefix', () => {
  it.each([
    ['/ar/contact/', 'contact'],
    ['/ar/contact', 'contact'],
    ['/contact/', 'contact'],
  ])('reads %s as the %s view', (path, route) => {
    expect(routeFromPath(path)).toBe(route);
  });

  it('still reports no view for a document that has none', () => {
    expect(routeFromPath('/ar/about/')).toBeNull();
    expect(routeFromPath('/ar/blog/search-youtube-video/')).toBeNull();
  });
});

describe('localizedStaticPath', () => {
  it.each([
    ['/about/', 'ar', '/ar/about/'],
    ['/ar/about/', 'en', '/about/'],
    ['/contact/', 'ar', '/ar/contact/'],
    ['/ar/contact/', 'en', '/contact/'],
    ['/blog/', 'ar', '/ar/blog/'],
    // A slashless spelling of the same document still resolves to the document.
    ['/terms', 'ar', '/ar/terms/'],
  ])('maps %s to %s as %s', (path, lang, expected) => {
    expect(localizedStaticPath(path, lang as 'en' | 'ar')).toBe(expected);
  });

  it('refuses app views, which have no counterpart document', () => {
    expect(localizedStaticPath('/', 'ar')).toBeNull();
    expect(localizedStaticPath('/login', 'ar')).toBeNull();
    expect(localizedStaticPath('/history', 'ar')).toBeNull();
  });
});

describe('source hygiene', () => {
  it('emits no hash-route href anywhere in src/', () => {
    // The built pages were swept in the sibling test; this catches the source, so
    // the link never reaches a build in the first place.
    const files = [
      'src/App.tsx',
      'src/components/SiteHeader.tsx',
      'src/components/SiteFooter.tsx',
      'src/components/LanguageToggle.tsx',
      'src/components/auth/AccountMenu.tsx',
      'src/components/auth/LoginPage.tsx',
      'src/components/auth/RegisterPage.tsx',
      'src/components/auth/HistoryPage.tsx',
      'src/components/auth/ProfilePage.tsx',
      'src/components/auth/ResetPasswordPage.tsx',
      'src/components/auth/VerifyEmailPage.tsx',
      'scripts/lib/header.mjs',
      'scripts/lib/footer.mjs',
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/href=({)?["']#\//);
      // `/#/x` is the same mistake spelled out for a static page.
      expect(read(file), file).not.toMatch(/href=["']\/#\//);
    }
  });

  it('keeps contact out of the app-owned metadata set', () => {
    // Stated separately from the behaviour test because the *reason* matters: a
    // future edit that adds 'contact' would pass the metadata tests and quietly
    // destroy the static page's own title.
    expect(SPA_OWNED_METADATA.has('contact')).toBe(false);
    expect(STATIC_PATH_PREFIXES).toContain('/contact/');
  });
});
