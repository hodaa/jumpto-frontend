import { useEffect, useState } from 'react';

export type Route = 'home' | 'contact';

function readRoute(): Route {
  return window.location.hash.startsWith('#/contact') ? 'contact' : 'home';
}

/** Minimal hash router (#/contact) that keeps the SPA on a static host. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Entering the contact page from a scrolled home position should start at
  // the top. (Returning home via "/" does a full load, which already starts
  // at the top, so no scroll handling is needed there.)
  useEffect(() => {
    if (route !== 'contact') return;
    if (typeof window.scrollTo !== 'function') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  return route;
}