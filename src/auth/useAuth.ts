import { useContext } from 'react';
import { AuthContext } from './context';
import type { AuthState } from './context';

/**
 * Read the auth state.
 *
 * Safe outside a provider: it falls back to the signed-out default (see
 * ANONYMOUS), which is what keeps the header renderable on its own.
 */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
