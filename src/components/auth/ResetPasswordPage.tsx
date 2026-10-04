import { type FormEvent, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmPasswordReset, requestPasswordReset } from '../../api/authClient';
import { SuccessNotice } from '../SuccessNotice';
import { IconLock, IconMail } from '../icons';
import { AuthError, AuthField, AuthNotice, SubmitButton } from './AuthField';
import { AuthCard } from '../AuthCard';
import { useAuthErrorMessage, validatePassword } from './formHooks';
import {
  markResetCompletedInAddressBar,
  readResetCompletedFromLocation,
  readTokenFromLocation,
} from './token';
import { RouteLink } from '../RouteLink';

/**
 * Password reset, in two modes chosen by the presence of a token.
 *
 * With no token this asks for an address and always reports the same thing
 * back, because the backend answers 202 for unknown addresses too — a page that
 * said "no such account" would turn the form into a way to test whether someone
 * has one. With a token (from the emailed link) it sets a new password.
 */
export function ResetPasswordPage() {
  // A reload after a successful reset must not fall back to the request form.
  // The token is deliberately gone from the URL by then, so "no token" would
  // otherwise mean "send me another link" straight after the link was spent.
  if (readResetCompletedFromLocation()) return <ResetDone />;

  const token = readTokenFromLocation();
  return token ? <ResetConfirm token={token} /> : <ResetRequest />;
}

function ResetRequest() {
  const { t } = useTranslation();
  const emailId = useId();
  const describeError = useAuthErrorMessage();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <AuthCard
        title={t('auth.reset.requestTitle')}
        subtitle={t('auth.reset.requestSubtitle')}
        footer={
          <p className="text-center text-sm text-muted">
            <RouteLink to="login" className="font-semibold text-action hover:underline">
              {t('auth.reset.backToLogin')}
            </RouteLink>
          </p>
        }
      >
        {sent ? (
          <AuthNotice tone="info">
            {t('auth.reset.sentBody')}
            <span className="mt-1 block text-xs">{t('auth.reset.sentCheck')}</span>
          </AuthNotice>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <AuthError message={error} />
            <AuthField
              id={emailId}
              label={t('auth.fields.email')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(value) => {
                setEmail(value);
                if (error) setError(null);
              }}
              icon={<IconMail size={18} />}
              inputRef={emailRef}
            />
            <SubmitButton pending={pending}>{t('auth.reset.sendLink')}</SubmitButton>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

function ResetConfirm({ token }: { token: string }) {
  const { t } = useTranslation();
  const passwordId = useId();
  const describeError = useAuthErrorMessage();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const invalid = validatePassword(password);
    if (invalid) {
      setPasswordError(t(`auth.passwordError.${invalid}`));
      passwordRef.current?.focus();
      return;
    }
    // Caught here rather than server-side: a mismatch is a typo, and a round
    // trip cannot tell the visitor which of the two fields is the problem.
    if (password !== confirmation) {
      setConfirmError(t('auth.passwordError.mismatch'));
      confirmRef.current?.focus();
      return;
    }
    setPasswordError(null);
    setConfirmError(null);
    setError(null);
    setPending(true);
    try {
      await confirmPasswordReset(token, password);
      // The backend burns the token on success and revokes every session, so the
      // link is finished with — drop it from the address bar before showing the
      // confirmation, in case the visitor reloads or shares the screen. The
      // marker is what makes that confirmation survive the reload.
      markResetCompletedInAddressBar();
      setDone(true);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setPending(false);
    }
  };

  if (done) return <ResetDone />;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <AuthCard title={t('auth.reset.confirmTitle')} subtitle={t('auth.reset.confirmSubtitle')}>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <AuthError message={error} />
          <AuthField
            id={passwordId}
            label={t('auth.fields.newPassword')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError(null);
            }}
            icon={<IconLock size={18} />}
            inputRef={passwordRef}
            error={passwordError}
            hint={t('auth.password.hint')}
          />
          <AuthField
            id={`${passwordId}-confirm`}
            label={t('auth.fields.confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(value) => {
              setConfirmation(value);
              if (confirmError) setConfirmError(null);
            }}
            icon={<IconLock size={18} />}
            inputRef={confirmRef}
            error={confirmError}
          />
          <SubmitButton pending={pending}>{t('auth.reset.setPassword')}</SubmitButton>
        </form>
      </AuthCard>
    </div>
  );
}

function ResetDone() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <AuthCard title={t('auth.reset.doneTitle')}>
        <SuccessNotice>{t('auth.reset.doneBody')}</SuccessNotice>
        <RouteLink
          to="login"
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-action px-5 py-2.5 text-base font-semibold text-white transition-colors duration-200 hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        >
          {t('auth.reset.backToLogin')}
        </RouteLink>
      </AuthCard>
    </div>
  );
}
