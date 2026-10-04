import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GOOGLE_CLIENT_ID } from '../../config';
import { IconAlert } from '../icons';

/** Google's JS is a third-party script, so its shape is declared locally. */
interface GoogleCredentialResponse {
  credential?: string;
}
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/**
 * In-flight and settled script loads, keyed by language.
 *
 * Keyed rather than a single promise because the widget's language is fixed
 * when the script is fetched, so each language needs its own load.
 */
const scriptLoads = new Map<string, Promise<void>>();

function injectScript(lang: string, { fresh = false } = {}): Promise<void> {
  // `hl` on the script URL is the only thing that sets the widget's language.
  // The `locale` option on renderButton is silently ignored - Google resolves
  // the button text from its own locale detection, so an Arabic page shows
  // whatever the visitor's Google profile happens to be set to. Passing the
  // language here is what makes the button speak the page's language.
  const src = `${SCRIPT_SRC}?hl=${encodeURIComponent(lang)}`;
  return new Promise<void>((resolve, reject) => {
    // A reload must always add a new tag. The tag for this language loaded the
    // first time and has already fired its `load` event, so re-using it would
    // wait for an event that will never fire again and the button would never
    // come back on switching back to a language already visited.
    const existing = fresh
      ? null
      : document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = src;
      script.async = true;
      script.defer = true;
    }
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Google script failed')), {
      once: true,
    });
    if (!existing) document.head.appendChild(script);
  });
}

/**
 * Load Google's sign-in script for one language and resolve when it is ready.
 *
 * A custom element is used rather than the FedCM helper because it degrades to a
 * popup on browsers without FedCM, and a visitor with neither still gets a
 * working button rather than a dead control.
 *
 * `reload` re-fetches the script even if Google's globals are already present.
 * That is the only way to change the widget's language after the fact, because
 * a script already on the page has already captured its locale. It is passed
 * when the visitor switches language mid-session.
 */
function loadGoogleScript(lang: string, { reload = false } = {}): Promise<void> {
  if (!reload && window.google?.accounts?.id) return Promise.resolve();
  if (!reload) {
    const settled = scriptLoads.get(lang);
    if (settled) return settled;
  }
  const promise = injectScript(lang, { fresh: reload });
  if (!reload) {
    scriptLoads.set(lang, promise);
    // A failed load must not poison every later attempt with a rejected promise.
    promise.catch(() => {
      scriptLoads.delete(lang);
    });
  }
  return promise;
}

export interface GoogleButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  /**
   * Which verb the button leads with. Google's widget picks the wording, so
   * asking it to say "sign up" on the register page and "sign in" on the login
   * page is the difference between an accurate label and one vague label doing
   * the job of two. Left unset, the neutral "continue with" is used.
   */
  variant?: 'register' | 'signin';
}

/** The wording Google's own button uses for each verb. */
const BUTTON_TEXT = {
  register: 'signup_with',
  signin: 'signin_with',
} as const;

/**
 * Point a visitor whose account has no password at the Google button.
 *
 * An account created with Google has no password at all, so the password form
 * can only ever answer "wrong details" for it. That reads as a typo rather than
 * a dead end, which is how a correct address ends up looking unregistered.
 *
 * Deliberately not conditional on the address that was tried. The backend
 * returns one indistinguishable failure for an unknown address, a wrong
 * password, and a Google-only account, and that has to stay true: a hint
 * appearing for some addresses and not others would turn the form into a probe
 * for which addresses are registered. This text is shown either way, so it
 * carries no information about the account.
 */
export const GoogleOnlyHint = memo(function GoogleOnlyHint() {
  const { t } = useTranslation();
  return (
    <p className="text-center text-xs text-muted" data-testid="google-only-hint">
      {t('auth.login.googleHint')}
    </p>
  );
});

/**
 * Google's own sign-in button.
 *
 * Google's widget is rendered rather than an imitation of it, because the
 * credential has to be minted by Google: the backend verifies the signature and
 * refuses anything it did not sign, which is what makes the address trustworthy
 * without an email round trip. A hand-rolled button that looked similar but
 * collected an email string would be worthless as proof.
 */
export const GoogleButton = memo(function GoogleButton({
  onCredential,
  disabled,
  variant,
}: GoogleButtonProps) {
  const { t, i18n } = useTranslation();
  // Normalised the same way the rest of the app derives a language, so the
  // widget is asked for a language the page is actually written in.
  const lang = i18n.language === 'en' ? 'en' : 'ar';
  const container = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  /** The language last rendered, to tell a first render from a switch. */
  const renderedLangRef = useRef<string | null>(null);

  // The callback is read fresh on each render so a stale closure cannot hand
  // Google's token to a component that has since unmounted.
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!container.current) return;
    let active = true;
    // A language switch has to re-fetch the script, because the copy already on
    // the page captured the old language. Comparing against the language last
    // rendered rather than counting renders keeps this to a genuine switch: a
    // second effect run on the same language - which StrictMode does on every
    // mount in development - re-renders without pulling a second copy of
    // Google's script onto the page.
    const firstRun = renderedLangRef.current === null;
    const languageChanged = !firstRun && renderedLangRef.current !== lang;
    renderedLangRef.current = lang;
    // Re-rendering into a node that still holds the previous widget would stack
    // a second button on top of the first, so the node is emptied first.
    if (!firstRun && container.current) container.current.innerHTML = '';

    loadGoogleScript(lang, { reload: languageChanged })
      .then(() => {
        const id = window.google?.accounts?.id;
        if (!id || !container.current || !active) return;
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        id.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: variant ? BUTTON_TEXT[variant] : 'continue_with',
          shape: 'rectangular',
          // Kept even though Google's widget ignores it in favour of the `hl`
          // on the script URL: it costs nothing and is the documented way to
          // ask, in case that ever changes.
          locale: lang,
        });
      })
      .catch(() => {
        if (!active) return;
        // The failure is reported in place rather than thrown to the parent:
        // it means Google's script did not load, which is a problem with this
        // button, not with the credentials the visitor typed elsewhere.
        setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [lang, variant]);

  if (failed) {
    return (
      <p className="flex items-center gap-2 text-sm text-danger" role="alert">
        <IconAlert size={16} aria-hidden="true" />
        {t('auth.google.unavailable')}
      </p>
    );
  }

  return (
    <div
      ref={container}
      className={`flex min-h-[44px] justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      data-testid="google-button"
    />
  );
});
