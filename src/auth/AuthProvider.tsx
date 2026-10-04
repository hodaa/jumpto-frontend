import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AUTH_UNAUTHENTICATED_EVENT,
  AuthApiError,
  fetchSession,
  loginAccount,
  loginWithGoogle,
  logoutAccount,
  registerAccount,
} from '../api/authClient';
import { trackEvent } from '../utils/analytics';
import type { AuthUser } from '../types';
import { AuthContext } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const handleUnauthenticated = () => {
      if (active) setUser(null);
    };

    window.addEventListener(AUTH_UNAUTHENTICATED_EVENT, handleUnauthenticated);

    // A visitor with no session is the common case, not an error, so a failure
    // here must not surface as a message — the site is fully usable signed out.
    fetchSession()
      .then((info) => {
        if (active) setUser(info?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.removeEventListener(AUTH_UNAUTHENTICATED_EVENT, handleUnauthenticated);
    };
  }, []);

  /**
   * Reconcile against the session endpoint after signing in.
   *
   * The sign-in response says who authenticated, but only the session endpoint
   * knows what the browser actually stored, and it is also where the CSRF token
   * for later mutations comes from. A visitor who arrived signed out has never
   * seen it, so without this they would hold no token and their first
   * cookie-authenticated action would come back CSRF_FAILED.
   *
   * Failures are swallowed: the account is already in state, and a network blip
   * must not turn a successful sign-in into a visible error.
   */
  const settleSession = useCallback(async () => {
    try {
      const info = await fetchSession();
      setUser(info?.user ?? null);
    } catch {
      // Keep the account from the sign-in response.
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const issued = await loginAccount(email, password);
      setUser(issued.user);
      await settleSession();
      trackEvent('sign_in', { method: 'password' });
    },
    [settleSession],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const issued = await loginWithGoogle(idToken);
      setUser(issued.user);
      await settleSession();
      trackEvent('sign_in', { method: 'google' });
    },
    [settleSession],
  );

  const signUp = useCallback(async (email: string, password: string) => {
    await registerAccount(email, password);
    trackEvent('sign_up', { method: 'password' });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutAccount();
    } catch (error) {
      // A failed logout still clears the cookie locally, so the visitor is not
      // left staring at an account page they can no longer use.
      if (!(error instanceof AuthApiError)) throw error;
    }
    setUser(null);
    trackEvent('sign_out');
  }, []);

  const refresh = useCallback(async () => {
    const info = await fetchSession();
    setUser(info?.user ?? null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signInWithGoogle, signUp, signOut, refresh }),
    [user, loading, signIn, signInWithGoogle, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
