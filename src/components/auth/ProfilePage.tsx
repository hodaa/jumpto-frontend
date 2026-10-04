import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { requestPasswordReset, requestPasswordSet } from '../../api/authClient';
import { navigate } from '../../hooks/useRoute';
import { formatDay } from '../../utils/datetime';
import { SuccessNotice } from '../SuccessNotice';
import { IconCheck, IconHistory, IconLock, IconMail, IconUser } from '../icons';
import { AuthError } from './AuthField';
import { AuthCard } from '../AuthCard';
import { ChangePasswordForm } from './ChangePasswordForm';
import { useAuthErrorMessage } from './formHooks';
import { RouteLink } from '../RouteLink';

/** One labelled fact in the account summary. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-muted-strong">{children}</dd>
    </div>
  );
}

/**
 * The signed-in visitor's own account.
 *
 * It has two jobs, and they used to be collapsed into one button. A Google-only
 * account has no password at all — registering with Google leaves
 * `password_hash` empty, so the login page can only ever answer "wrong details"
 * for it — and this page offers to add one. An account that *already* has a
 * password came here to look at its details, not to change a credential, so
 * changing it is offered as a quiet link that opens a form in place, and the
 * current browser stays signed in while every other session is revoked.
 *
 * A first password still goes out by email. Minting one from a live session
 * would mean the session cookie alone was enough authority, and a cookie lifted
 * through XSS or a shared machine could then claim the account for good. The
 * link proves control of the address at the moment of the change. That path is
 * kept for anyone who has forgotten their current password too, since an old
 * password is exactly what they cannot produce.
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, loading, signOut } = useAuth();
  const describeError = useAuthErrorMessage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Latches after the link is sent. Sending is not idempotent from the
  // visitor's point of view — each press mails another link — so the action is
  // replaced by its outcome rather than left armed to be pressed again.
  const [sent, setSent] = useState(false);
  // Whether the inline change form is open. Kept separate from `sent` so the
  // emailed-link outcome and the in-page outcome cannot overwrite each other.
  const [changing, setChanging] = useState(false);

  // The session check is still in flight. Rendering the page as "signed out"
  // first would flash a sign-in prompt at someone who is signed in.
  if (loading) {
    return (
      <div className="py-10 sm:py-14">
        <div
          className="mx-auto h-64 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 animate-pulse"
          aria-busy="true"
          aria-label={t('auth.profile.loading')}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-10 sm:py-14">
        <AuthCard
          icon={<IconUser size={32} />}
          title={t('auth.profile.signedOutTitle')}
          subtitle={t('auth.profile.signedOutBody')}
        >
          <RouteLink
            to="login"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-action px-5 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-action-hover hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            {t('auth.nav.signIn')}
          </RouteLink>
        </AuthCard>
      </div>
    );
  }

  const hasPassword = user.has_password;
  const locale = i18n.language === 'ar' ? 'ar' : 'en-GB';

  const handleSendLink = async () => {
    setError(null);
    setPending(true);
    try {
      // The visitor's own address, taken from the session rather than from a
      // field, so this cannot be pointed at somebody else's inbox.
      //
      // The two cases are different endpoints, not one button with two labels.
      // A Google-only account has no password to replace, so it asks the backend
      // to mint a first one; an account that already has one needs the reset
      // link instead. Calling the first for both is why a change button used to
      // appear to work and quietly mail nothing: /password-set declines accounts
      // that already have a password and still answers 202.
      if (hasPassword) {
        await requestPasswordReset(user.email);
      } else {
        await requestPasswordSet();
      }
      setSent(true);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="py-10 sm:py-14">
      <AuthCard
        icon={<IconUser size={32} />}
        // Greet by name; the address stays in the details below, since it is the
        // account's actual identifier and the destination of any emailed link.
        // Greet by name; the address stays in the details below, since it is the
        // account's actual identifier and the destination of any emailed link.
        title={user.full_name ? user.full_name : t('auth.profile.title')}
        subtitle={t('auth.profile.subtitle')}
      >
        <dl>
          <Detail label={t('auth.profile.email')}>
            <span dir="auto" className="u-isolate">
              {user.email}
            </span>
          </Detail>
          <Detail label={t('auth.profile.status')}>
            {user.email_verified ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <IconCheck size={16} aria-hidden="true" />
                {t('auth.profile.verified')}
              </span>
            ) : (
              <span className="text-muted">{t('auth.profile.unverified')}</span>
            )}
          </Detail>
          <Detail label={t('auth.profile.signInMethod')}>
            {/* Both can be true at once: a Google account that has since set a
                password can use either. Naming the one still standing is what
                matters if the visitor arrives with neither. */}
            {hasPassword ? t('auth.profile.methodPassword') : t('auth.profile.methodGoogle')}
          </Detail>
          <Detail label={t('auth.profile.memberSince')}>
            <time dateTime={user.created_at}>{formatDay(user.created_at, locale, '')}</time>
          </Detail>
        </dl>

        <AuthError message={error} />

        {sent ? (
          <div className="space-y-3">
            <SuccessNotice icon={<IconMail size={18} />}>
              {t('auth.profile.linkSent', { email: user.email })}
            </SuccessNotice>
            <p className="text-xs leading-relaxed text-muted">{t('auth.profile.linkSentNote')}</p>
          </div>
        ) : hasPassword ? (
          /* Someone who already has a password came here to look at their
             account, not to change a credential, so changing it is a quiet link
             under the summary rather than the page's primary action. The form it
             opens stays on this page and keeps this browser signed in. */
          changing ? (
            <ChangePasswordForm onCancel={() => setChanging(false)} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-strong">
                {t('auth.profile.changeBody')}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary underline decoration-accent/60 underline-offset-4 transition-colors duration-200 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  <IconLock size={16} aria-hidden="true" />
                  {t('auth.profile.changeLink')}
                </button>
                {/* Kept as the way out for whoever has forgotten the old one: the
                    emailed link verifies the address, which a current password
                    cannot when it is the thing that is lost. */}
                <button
                  type="button"
                  onClick={() => void handleSendLink()}
                  disabled={pending}
                  aria-busy={pending}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconMail size={16} aria-hidden="true" />
                  {t('auth.profile.emailLinkInstead')}
                </button>
              </div>
            </div>
          )
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted-strong">{t('auth.profile.setBody')}</p>
            <button
              type="button"
              onClick={() => void handleSendLink()}
              disabled={pending}
              aria-busy={pending}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg bg-action px-5 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-action-hover hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconLock size={18} aria-hidden="true" />
              {t('auth.profile.setAction')}
            </button>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5">
          <RouteLink
            to="history"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <IconHistory size={16} aria-hidden="true" />
            {t('auth.nav.history')}
          </RouteLink>
          <button
            type="button"
            onClick={() => {
              void signOut();
              navigate('home');
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-strong transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <IconLock size={16} aria-hidden="true" />
            {t('auth.nav.signOut')}
          </button>
        </div>
      </AuthCard>
    </div>
  );
}
