import type { AuthUser } from '../types';

/**
 * The label to greet an account by.
 *
 * Google's display name when there is one, otherwise the address. Two reasons
 * this is a function rather than a field read: a password-only account has no
 * name at all, and Google can omit the claim entirely, so in both cases the
 * fallback is the norm rather than the exception. The trim also covers a name
 * that is present but blank, which would otherwise greet somebody with nothing.
 */
export function displayName(user: Pick<AuthUser, 'full_name' | 'email'>): string {
  return user.full_name?.trim() || user.email;
}
