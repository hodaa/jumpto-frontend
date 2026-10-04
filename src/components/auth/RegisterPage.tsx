import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { GOOGLE_CLIENT_ID } from '../../config';
import { navigate } from '../../hooks/useRoute';
import { SuccessNotice } from '../SuccessNotice';
import { IconAlert, IconCheck, IconLock, IconMail, IconUser } from '../icons';
import { AuthError, AuthField, OrDivider, SubmitButton } from './AuthField';
import { AuthCard } from '../AuthCard';
import { useAuthErrorMessage, useCredentialsFields, validatePassword } from './formHooks';
import { GoogleButton } from './GoogleButton';
import { RouteLink } from '../RouteLink';

/** Live password strength, so the rules are visible before the first rejection. */
function strengthOf(password: string): 'none' | 'weak' | 'fair' | 'good' {
  if (password.length < 8) return password ? 'weak' : 'none';
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score += 1;
  if (score >= 3) return 'good';
  return 'fair';
}

const STRENGTH_LABEL = {
  none: 'auth.password.none',
  weak: 'auth.password.weak',
  fair: 'auth.password.fair',
  good: 'auth.password.good',
} as const;

const STRENGTH_CLASS = {
  none: 'bg-border',
  weak: 'bg-danger',
  fair: 'bg-warning',
  good: 'bg-success',
} as const;

const STRENGTH_WIDTH = { none: 'w-0', weak: 'w-1/4', fair: 'w-2/4', good: 'w-full' } as const;

export function RegisterPage() {
  const { t } = useTranslation();
  const { signUp, signInWithGoogle } = useAuth();
  const describeError = useAuthErrorMessage();
  const { emailId, passwordId, email, setEmail, password, setPassword, emailRef, passwordRef } =
    useCredentialsFields();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const invalid = validatePassword(password);
    if (invalid) {
      setPasswordError(t(`auth.passwordError.${invalid}`));
      passwordRef.current?.focus();
      return;
    }
    setPasswordError(null);
    setError(null);
    setPending(true);
    try {
      await signUp(email.trim(), password);
      // Registration does not sign the visitor in: the address is unverified
      // until the emailed link is opened, and login would fail until then.
      setSent(true);
      setPending(false);
    } catch (caught) {
      setError(describeError(caught));
      setPending(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogle(idToken);
      navigate('home');
    } catch (caught) {
      setError(describeError(caught));
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="py-10 sm:py-14">
        <AuthCard
          icon={<IconCheck size={32} />}
          title={t('auth.register.sentTitle')}
          subtitle={t('auth.register.sentBody', { email })}
        >
          <SuccessNotice>{t('auth.register.sentCheck', { email })}</SuccessNotice>
          <RouteLink
            to="login"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-action px-5 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-action-hover hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            {t('auth.register.backToLogin')}
          </RouteLink>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-14">
      <AuthCard
        icon={<IconUser size={32} />}
        title={t('auth.register.title')}
        subtitle={t('auth.register.subtitle')}
        footer={
          <p className="text-center text-sm text-muted">
            {t('auth.register.haveAccount')}{' '}
            <RouteLink to="login" className="font-semibold text-action hover:underline">
              {t('auth.register.signIn')}
            </RouteLink>
          </p>
        }
      >
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
          <div>
            <AuthField
              id={passwordId}
              label={t('auth.fields.password')}
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
            {password ? (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div
                    className={`h-full transition-all duration-300 ${STRENGTH_CLASS[strengthOf(password)]} ${STRENGTH_WIDTH[strengthOf(password)]}`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {t(STRENGTH_LABEL[strengthOf(password)])}
                </p>
              </div>
            ) : null}
          </div>
          <p className="flex items-start gap-2 text-xs text-muted">
            <IconAlert size={14} />
            {t('auth.register.termsNote')}
          </p>
          <SubmitButton pending={pending}>{t('auth.register.submit')}</SubmitButton>
        </form>

        {GOOGLE_CLIENT_ID ? (
          <>
            <OrDivider />
            <GoogleButton onCredential={handleGoogle} disabled={pending} variant="register" />
            <p className="text-center text-xs text-muted">{t('auth.google.disclaimer')}</p>
          </>
        ) : null}
      </AuthCard>
    </div>
  );
}
