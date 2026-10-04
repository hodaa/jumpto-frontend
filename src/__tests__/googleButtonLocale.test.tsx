import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

/**
 * The language Google's widget should be asked for, set by each test.
 *
 * `useTranslation` is stubbed rather than driven through i18next so the language
 * is a plain variable. Switching it and re-rendering is deterministic, and the
 * component is re-imported per test so its script cache starts empty - that
 * cache is module state, and a test that inherits the previous test's warm cache
 * cannot observe the load it is asserting on.
 */
let currentLang = 'ar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: currentLang } }),
}));

vi.mock('../config', () => ({
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
}));

const renderButton = vi.fn();
const initialize = vi.fn();

/** Script tags the component injected, in order. */
let injected: HTMLScriptElement[] = [];

/**
 * Intercept Google's script instead of letting jsdom fetch it.
 *
 * Stubbing `window.google` up front - as the earlier suites do - makes these
 * tests blind to the bug: the widget's language lives in the script URL, so a
 * test that never loads a script can never check it. Here the tag is caught, and
 * only supplied the globals once it "loads", the same order as a real page.
 */
function interceptScripts() {
  const append = document.head.appendChild.bind(document.head);
  vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
    if (node instanceof HTMLScriptElement) injected.push(node);
    return append(node);
  });
}

/** Pretend the intercepted script finished loading and supplied the globals. */
function completeLoad(script: HTMLScriptElement) {
  vi.stubGlobal('google', { accounts: { id: { initialize, renderButton } } });
  script.dispatchEvent(new Event('load'));
}

/** A fresh copy of the component, with its own script cache. */
async function loadComponent() {
  vi.resetModules();
  const mod = await import('../components/auth/GoogleButton');
  return mod.GoogleButton;
}

async function mount(props: { variant?: 'register' | 'signin' } = {}) {
  const GoogleButton = await loadComponent();
  return render(<GoogleButton onCredential={() => {}} disabled={false} {...props} />);
}

describe('the Google button speaks the page language', () => {
  beforeEach(() => {
    injected = [];
    renderButton.mockClear();
    initialize.mockClear();
    vi.unstubAllGlobals();
    document.head.querySelectorAll('script').forEach((s) => s.remove());
    interceptScripts();
    currentLang = 'ar';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for Arabic when the page is in Arabic', async () => {
    // The one that matters. Google ignores its own `locale` option and resolves
    // the button text on its own side, so the only thing that makes an Arabic
    // page show an Arabic button is `hl` on the script URL.
    await mount({ variant: 'register' });

    await waitFor(() => expect(injected.length).toBe(1));
    expect(injected[0].src).toContain('hl=ar');

    completeLoad(injected[0]);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({ locale: 'ar' });
  });

  it('asks for English when the page is in English', async () => {
    currentLang = 'en';
    await mount();
    await waitFor(() => expect(injected.length).toBe(1));
    expect(injected[0].src).toContain('hl=en');
  });

  it('leads with the verb the page is about', async () => {
    // One vague label doing the job of two pages reads as the wrong verb
    // whichever page you are on.
    await mount({ variant: 'register' });
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({ text: 'signup_with' });
  });

  it('says sign in on the login page', async () => {
    await mount({ variant: 'signin' });
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({ text: 'signin_with' });
  });

  it('stays neutral when no verb is given', async () => {
    await mount();
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({ text: 'continue_with' });
  });

  it('re-fetches in the new language when the visitor switches', async () => {
    // A script already on the page captured its language, so switching without
    // re-fetching leaves an English button sitting on an Arabic page.
    const GoogleButton = await loadComponent();
    const view = render(<GoogleButton onCredential={() => {}} variant="register" />);
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));

    currentLang = 'en';
    view.rerender(<GoogleButton onCredential={() => {}} variant="register" />);

    await waitFor(() => expect(injected.length).toBe(2));
    expect(injected[0].src).toContain('hl=ar');
    expect(injected[1].src).toContain('hl=en');

    completeLoad(injected[1]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(2));
    expect(renderButton.mock.calls[1][1]).toMatchObject({ locale: 'en' });
  });

  it('can return to a language it has already loaded', async () => {
    // The tag for Arabic already fired its load event the first time round.
    // Re-using that settled tag would wait forever, and the button would never
    // come back on the way back to Arabic.
    const GoogleButton = await loadComponent();
    const view = render(<GoogleButton onCredential={() => {}} />);
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));

    currentLang = 'en';
    view.rerender(<GoogleButton onCredential={() => {}} />);
    await waitFor(() => expect(injected.length).toBe(2));
    completeLoad(injected[1]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(2));

    currentLang = 'ar';
    view.rerender(<GoogleButton onCredential={() => {}} />);
    // A third tag, not a second listener on the first.
    await waitFor(() => expect(injected.length).toBe(3));
    expect(injected[2].src).toContain('hl=ar');

    completeLoad(injected[2]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(3));
  });

  it('does not stack a second button when it re-renders', async () => {
    // renderButton appends into the container it is handed, so re-rendering into
    // a node that still holds the previous one leaves two buttons on the page.
    // The mock appends for real so the stacking is observable.
    renderButton.mockImplementation((parent: HTMLElement) => {
      parent.appendChild(document.createElement('div'));
    });

    const GoogleButton = await loadComponent();
    const view = render(<GoogleButton onCredential={() => {}} />);
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));

    const host = view.container.querySelector('[data-testid="google-button"]');
    expect(host?.children).toHaveLength(1);

    currentLang = 'en';
    view.rerender(<GoogleButton onCredential={() => {}} />);
    await waitFor(() => expect(injected.length).toBe(2));
    completeLoad(injected[1]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(2));

    // Still one button, not the old one plus a new one.
    expect(host?.children).toHaveLength(1);
  });

  it('does not refetch the script when only the verb changes', async () => {
    // The language, not the render, is what the script carries. A re-render on
    // the same language must reuse the loaded script, or every effect re-run
    // - which StrictMode does on every mount in development - puts another copy
    // of Google's script on the page.
    const GoogleButton = await loadComponent();
    const view = render(<GoogleButton onCredential={() => {}} variant="register" />);
    await waitFor(() => expect(injected.length).toBe(1));
    completeLoad(injected[0]);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));

    view.rerender(<GoogleButton onCredential={() => {}} variant="signin" />);

    // The button is rebuilt for the new verb...
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(2));
    expect(renderButton.mock.calls[1][1]).toMatchObject({ text: 'signin_with' });
    // ...but no second copy of the script was fetched.
    expect(injected.length).toBe(1);
  });

  it('reports a failed script load in place of the button', async () => {
    const GoogleButton = await loadComponent();
    const view = render(<GoogleButton onCredential={() => {}} />);
    await waitFor(() => expect(injected.length).toBe(1));

    injected[0].dispatchEvent(new Event('error'));
    // The message is auth.google.unavailable, because `t` returns the key here.
    await waitFor(() => expect(view.container.textContent).toContain('auth.google.unavailable'));
  });
});
