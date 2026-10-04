import { useEffect, useSyncExternalStore } from 'react';
import { ROUTE_PATH, legacyHashRoute, routeFromPath } from '../routes';
import type { Route } from '../routes';

/**
 * Path router for the client-rendered views.
 *
 * Reads `location.pathname` instead of the fragment, so every URL the app owns is
 * a real, linkable, indexable path (`/login`, not `/#/login`). The History API
 * replaces the hash router's `location.hash` assignment; `pushState` deliberately
 * fires no event of its own, so navigations are announced on a private event and
 * browser Back/Forward arrives through `popstate`.
 *
 * In-page fragments (`/#how-it-works`) are untouched by design: those are
 * same-document anchors, not routes, and they are what the header nav uses.
 *
 * The route is *derived* from the pathname rather than mirrored into state. The
 * URL is already the single source of truth; copying it into `useState` meant a
 * second thing to keep in step, and every place the two could disagree needed an
 * effect to fix it up. Subscribing to the pathname instead means a `replaceState`
 * that rewrites the address bar is a render, not an afterthought.
 */

const NAVIGATION_EVENT = 'qfza:navigate';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATION_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATION_EVENT, onChange);
  };
}

/** The route for the current URL, or home when the host owns the path. */
function getPathname(): string {
  return window.location.pathname;
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, getPathname, getPathname);
  const route = routeFromPath(pathname) ?? 'home';

  // Heal a legacy `/#/login` link into the clean path it now lives at.
  //
  // These URLs were emailed and bookmarked before the move to clean paths, so
  // they have to keep resolving — but they must not survive as a second spelling
  // of the same view, which is exactly the duplicate-URL pattern that splits
  // ranking signals. `replaceState` (never `pushState`) rewrites the address bar
  // without adding a history entry, so Back still leaves the way it arrived.
  //
  // Rewriting the pathname is enough to be correct: the store is the pathname,
  // so announcing the change is all it takes for the route to follow. No local
  // state is set here, which is what keeps this from being a second, divergent
  // copy of where the user is.
  useEffect(() => {
    const legacy = legacyHashRoute(window.location.hash);
    if (!legacy) return;
    // The hash may be carrying the only copy of a query string: an emailed
    // `/#/reset-password?token=…` keeps its token there. Discarding it with the
    // fragment would leave ResetPasswordPage reading "no token" and asking for an
    // address, which looks exactly like a link that was already used. Migrating
    // the query onto the path both preserves the token and upgrades the URL to the
    // canonical form.
    const legacyQuery = window.location.hash.split('?')[1];
    const query = legacyQuery ? `${ROUTE_PATH[legacy]}?${legacyQuery}` : ROUTE_PATH[legacy];
    window.history.replaceState(null, '', query);
    window.dispatchEvent(new Event(NAVIGATION_EVENT));
  }, []);

  // Entering a page from a scrolled home position should start at the top.
  // Also move focus to #main-content so screen-reader users get a page-change
  // announcement when navigating via the account menu.
  useEffect(() => {
    if (route === 'home') return;
    if (typeof window.scrollTo !== 'function') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.getElementById('main-content')?.focus();
  }, [route]);

  return route;
}

/**
 * Navigate to an SPA route.
 *
 * `replace` is for navigation that should not leave a Back entry (healing a
 * legacy URL, or a redirect the visitor did not ask for).
 */
export function navigate(to: Route, options: { replace?: boolean } = {}): void {
  const path = ROUTE_PATH[to];
  if (options.replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}