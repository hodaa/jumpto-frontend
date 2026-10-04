import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { normalizePath, isStaticPath, routeFromPath, ROUTE_PATH } from '../routes';
import type { Route } from '../routes';
import { navigate } from '../hooks/useRoute';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

function isRouteKey(value: string): value is Route {
  return Object.prototype.hasOwnProperty.call(ROUTE_PATH, value);
}

/**
 * A link to a real URL that behaves correctly for both kinds of page.
 *
 * Every href this app emits is a genuine path — there is no `#/` anywhere — so
 * the markup works with JavaScript disabled, is copyable, and can be crawled.
 * What differs is only whether the browser should re-request the document:
 *
 * - A generated static page (`/privacy/`, `/blog/<post>/`, `/about/`) is a real
 *   file, so it gets a real navigation. Soft-navigating to it would leave the
 *   visitor reading the previous document under a new address bar.
 * - An SPA view (`/login`, `/history`) is the same document rendered
 *   differently, so the click is intercepted and the router swaps the view.
 *   Back and Forward work because the router pushes real history entries.
 *
 * Modified clicks are always left to the browser, so open-in-new-tab and
 * open-in-new-window keep working on both kinds of target.
 */
export function RouteLink({
  to,
  onClick,
  ...rest
}: AnchorProps & { to: Route | string }) {
  const key = isRouteKey(to) ? to : null;
  const href = key ? ROUTE_PATH[key] : to;
  const route = key ?? routeFromPath(href);
  // Only the router's own canonical path for a client view is soft-navigated.
  // A static page that happens to share a route name (/contact/) must not be.
  const soft =
    route !== null && !isStaticPath(href) && normalizePath(href) === normalizePath(ROUTE_PATH[route]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!soft || event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(route);
  };

  return <a href={href} onClick={handleClick} {...rest} />;
}