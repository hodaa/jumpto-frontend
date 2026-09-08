/* Lightweight gtag wrapper. Keeps analytics optional: nothing throws and no
   event fires if the tag isn't loaded (e.g. in tests, offline, or if the
   snippet is ever removed). The snippet defines `window.gtag`; read it fresh
   on each call so a late-loading tag still works after the page starts. */
function gtagQueue(...args: unknown[]) {
  const gtag = (window as unknown as { gtag?: (...rest: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') gtag(...args);
}

/** Fire a Google Analytics custom event with optional params. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  gtagQueue('event', name, params);
}