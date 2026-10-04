/**
 * Read the one-shot token from an emailed link.
 *
 * The backend builds those links as `<PUBLIC_SITE_URL>/reset-password?token=…`
 * and `/verify-email?token=…`, i.e. a real path with a query string. The app
 * routes internally by hash, so a token can arrive two ways: on the query of a
 * path (the emailed link) or on the query of a hash (an in-app navigation).
 * Both are checked rather than one, because a link that silently finds no token
 * looks to the visitor like their reset link was already used.
 */
export function readTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const fromSearch = new URLSearchParams(window.location.search).get('token');
  if (fromSearch) return fromSearch;
  const query = window.location.hash.split('?')[1];
  if (!query) return null;
  return new URLSearchParams(query).get('token');
}

/** Marker left in the query string once a reset link has been spent. */
const RESET_COMPLETED_PARAM = 'completed';

/**
 * Replace a spent reset link with a marker that survives a reload.
 *
 * Clearing the token is only half the job. With the token gone, "no token" is
 * indistinguishable from "never had a token", so a refresh after a successful
 * reset fell back to the request form and offered to send another link — as if
 * the password had never been set.
 */
export function markResetCompletedInAddressBar(): void {
  if (typeof window === 'undefined') return;
  if (!window.history?.replaceState) return;
  const url = `${window.location.pathname}?${RESET_COMPLETED_PARAM}=1`;
  window.history.replaceState(null, '', url);
}

/** True once a reset has been completed in this tab, per the address bar. */
export function readResetCompletedFromLocation(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(RESET_COMPLETED_PARAM) === '1';
}

/**
 * Remove the token from the address bar once it has been read.
 *
 * The token is a bearer secret that grants the reset. Leaving it in the URL
 * means it lands in browser history, gets shared in a screenshot, and can be
 * reloaded a second time; the backend burns it on first use regardless, but
 * clearing it here keeps the exposure window to a single page view.
 */
export function clearTokenFromAddressBar(): void {
  if (typeof window === 'undefined') return;
  if (window.history?.replaceState) {
    const url = `${window.location.pathname}${window.location.hash.split('?')[0]}`;
    window.history.replaceState(null, '', url);
  }
}
