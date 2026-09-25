/** Contact email shown on the Contact page. Configurable via VITE_CONTACT_EMAIL. */
export const CONTACT_EMAIL: string =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() ?? 'hoda.hussin@gmail.com';

/** Whether an explicit contact email was provided in the build env. */
export const CONTACT_EMAIL_CONFIGURED: boolean = Boolean(
  import.meta.env.VITE_CONTACT_EMAIL?.trim(),
);

/** API base the search client talks to. */
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

/**
 * Form endpoint the contact form POSTs JSON to ({name, email, message}).
 *
 * Uses VITE_CONTACT_FORM_ENDPOINT when set (e.g. a third-party form service),
 * otherwise derives the backend's OWN /api/contact from VITE_API_BASE_URL so the
 * contact form rides the same API host as search. Empty = form hidden (mailto only).
 */
export const CONTACT_FORM_ENDPOINT: string =
  (import.meta.env.VITE_CONTACT_FORM_ENDPOINT as string | undefined)?.trim() ||
  (API_BASE_URL ? `${API_BASE_URL}/api/contact` : '');