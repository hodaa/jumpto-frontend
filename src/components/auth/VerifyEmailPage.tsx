import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { verifyEmailToken } from '../../api/authClient';
import { useAuth } from '../../auth/useAuth';
import { IconAlert, IconCheck } from '../icons';
import { clearTokenFromAddressBar, readTokenFromLocation } from './token';
import { RouteLink } from '../RouteLink';

/**
 * Redeems the emailed verification link.
 *
 * The link is a real path (`/verify-email?token=…`), which a static host would
 * 404, so vercel.json rewrites exactly that path to the SPA — no catch-all, and
 * therefore no way for a bad rule to swallow the whole site.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  // Read once, not per render: the token is a one-shot value that gets stripped
  // from the address bar as soon as it is spent, so re-reading it later would
  // be both wrong and non-deterministic.
  const [token] = useState(readTokenFromLocation);
  // Seeded from the URL rather than set inside the effect, so a link that never
  // carried a token renders its error on the first paint instead of flashing a
  // "verifying…" state that can never resolve.
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>(
    token ? 'verifying' : 'error',
  );
  const [message, setMessage] = useState<string | null>(
    token ? null : t('auth.verify.missingToken'),
  );

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    verifyEmailToken(token)
      .then(() => {
        if (!active) return;
        // The cookie may already hold a session for this address; re-read it so
        // the header and history page reflect the new verified state at once
        // instead of staying stale until the next full load.
        clearTokenFromAddressBar();
        void refresh();
        setStatus('done');
      })
      .catch(() => {
        if (!active) return;
        // One message for every failure. An expired, already-used, or forged
        // token are indistinguishable to the visitor, and saying which would
        // tell someone probing links which addresses are real.
        clearTokenFromAddressBar();
        setStatus('error');
        setMessage(t('auth.verify.failed'));
      });
    return () => {
      active = false;
    };
  }, [token, refresh, t]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
        {status === 'verifying' ? (
          <p className="text-muted" role="status">
            {t('auth.verify.verifying')}
          </p>
        ) : null}

        {status === 'done' ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
              <IconCheck size={24} />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-brand">{t('auth.verify.doneTitle')}</h1>
            <p className="mt-2 text-sm text-muted">{t('auth.verify.doneBody')}</p>
            <RouteLink
              to="home"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-action px-5 py-2.5 text-base font-semibold text-white transition-colors duration-200 hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              {t('auth.verify.backHome')}
            </RouteLink>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
              <IconAlert size={24} />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-brand">{t('auth.verify.errorTitle')}</h1>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <RouteLink
                to="login"
                className="inline-flex min-h-[44px] items-center rounded-lg bg-action px-5 py-2.5 text-base font-semibold text-white transition-colors duration-200 hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                {t('auth.verify.backHome')}
              </RouteLink>
              <RouteLink
                to="reset-password"
                className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-5 py-2.5 text-base font-semibold text-muted-strong transition-colors duration-200 hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                {t('auth.verify.requestNew')}
              </RouteLink>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
