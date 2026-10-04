import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { changePassword } from '../../api/authClient';
import { SuccessNotice } from '../SuccessNotice';
import { IconLock } from '../icons';
import { AuthError, AuthField, SubmitButton } from './AuthField';
import { useAuthErrorMessage, validatePassword } from './formHooks';

/**
 * Change the signed-in account's password in place.
 *
 * Reached from the profile page as a quiet link rather than as the page's
 * headline action, because most people visiting their profile are not here to
 * change a password — they came to check the address or sign out.
 *
 * The current password is still asked for. Holding a session is not the same as
 * owning the account: the session is a cookie, and one that leaked through XSS or
 * a shared machine would otherwise be enough to take the account over
 * permanently. Whoever is changing it has to show the thing being replaced.
 *
 * The current browser stays signed in. The backend revokes every *other* session,
 * so a stolen cookie elsewhere stops working the moment the real owner changes
 * the password — without signing the owner out of the tab they are using to do
 * it.
 */
export function ChangePasswordForm({ onCancel }: { onCancel: () => void }) {
  const { t } = useTranslation();
  const describeError = useAuthErrorMessage();
  const baseId = useId();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});

  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  /** Clear a field's error as soon as it is edited, so a fix is acknowledged. */
  const clearFieldError = (field: 'current' | 'next' | 'confirm') =>
    setFieldErrors((previous) =>
      previous[field] ? { ...previous, [field]: undefined } : previous,
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    // All three are checked before anything is sent, and the first one that
    // fails takes focus, so a short or mismatched password never costs a round
    // trip to learn something the form already knows.
    if (!currentPassword) {
      setFieldErrors({ current: t('auth.passwordError.required') });
      currentRef.current?.focus();
      return;
    }
    const invalid = validatePassword(newPassword);
    if (invalid) {
      setFieldErrors({ next: t(`auth.passwordError.${invalid}`) });
      nextRef.current?.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirm: t('auth.passwordError.mismatch') });
      confirmRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setDone(true);
    } catch (caught) {
      // A wrong current password lands here as INVALID_CREDENTIALS, the same
      // code a failed sign-in returns. It is attached to the field it concerns
      // rather than shown as a form-wide banner, so it is obvious which of the
      // three boxes was the problem.
      const message = describeError(caught);
      setError(message);
      setFieldErrors({ current: message });
      currentRef.current?.focus();
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3">
        <SuccessNotice>{t('auth.profile.changedCheck')}</SuccessNotice>
        <p className="text-xs leading-relaxed text-muted">{t('auth.profile.changedNote')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-strong">{t('auth.profile.changeBody')}</p>

      <AuthField
        id={`${baseId}-current`}
        label={t('auth.fields.currentPassword')}
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(value) => {
          setCurrentPassword(value);
          clearFieldError('current');
        }}
        icon={<IconLock size={18} aria-hidden="true" />}
        inputRef={currentRef}
        error={fieldErrors.current}
      />
      <AuthField
        id={`${baseId}-new`}
        label={t('auth.fields.newPassword')}
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(value) => {
          setNewPassword(value);
          clearFieldError('next');
        }}
        icon={<IconLock size={18} aria-hidden="true" />}
        inputRef={nextRef}
        error={fieldErrors.next}
      />
      <AuthField
        id={`${baseId}-confirm`}
        label={t('auth.fields.confirmPassword')}
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(value) => {
          setConfirmPassword(value);
          clearFieldError('confirm');
        }}
        icon={<IconLock size={18} aria-hidden="true" />}
        inputRef={confirmRef}
        error={fieldErrors.confirm}
      />

      <AuthError message={error} />

      <SubmitButton pending={pending}>{t('auth.profile.changeSubmit')}</SubmitButton>

      <button
        type="button"
        onClick={onCancel}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-muted-strong transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        {t('auth.profile.changeCancel')}
      </button>
    </form>
  );
}
