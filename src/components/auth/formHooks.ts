import { useCallback, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthApiError } from '../../api/authClient';

/**
 * Translate a backend error code into user-facing text.
 *
 * Memoised because callers put the result in an effect's dependency list. A new
 * closure per render made that effect re-run on every render — on the history
 * page that meant a network refetch per keystroke and per hover, which also
 * quietly undid a just-deleted row as soon as it re-rendered. The language
 * change is the one thing that should produce a new closure, and `t` changes
 * identity exactly then.
 */
export function useAuthErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown) => {
      if (error instanceof AuthApiError) return t(`auth.errors.${error.code}`);
      return t('auth.errors.UNKNOWN');
    },
    [t],
  );
}

/**
 * The backend's floor, in one place.
 *
 * `app/schemas/auth.py` sets `min_length=10` on both the register body and the
 * password-reset-confirm body. It used to say 8 here, with a comment claiming it
 * mirrored the backend: an 8- or 9-character password passed this check, the
 * server answered 422, and the visitor was told to try again later. The number
 * is pinned against the schema by a test so it cannot drift again.
 */
export const PASSWORD_MIN_LENGTH = 10;

/** Validate a client-side password before spending a round trip. */
export function validatePassword(value: string): 'required' | 'tooShort' | null {
  if (!value) return 'required';
  // Mirrors the backend's floor. Anything shorter cannot pass, so reporting it
  // here saves a request and an opaque 422.
  if (value.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  return null;
}

/** Email + password state for the login and register forms. */
export function useCredentialsFields() {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  return { emailId, passwordId, email, setEmail, password, setPassword, emailRef, passwordRef };
}
