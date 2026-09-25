import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_EMAIL, CONTACT_FORM_ENDPOINT } from '../config';
import { ContactForm } from './ContactForm';
import { IconMail } from './icons';

/** Contact page: a contact form (when configured) plus a mailto fallback. */
export const ContactPage = memo(function ContactPage() {
  const { t } = useTranslation();
  const hasForm = CONTACT_FORM_ENDPOINT.length > 0;
  const mailHref = CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : undefined;
  const subject = encodeURIComponent(t('contact.emailLabel'));

  return (
    <main id="main-content" tabIndex={-1} className="app-main">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-10 text-center sm:py-14">
        <span className="text-accent" aria-hidden="true">
          <IconMail size={32} />
        </span>
        <h1 className="section-title">{t('contact.title')}</h1>
        <p className="text-muted-strong max-w-md text-lg font-medium leading-relaxed">
          {t('contact.lead')}
        </p>

        {hasForm ? (
          <div className="mt-2 w-full">
            <ContactForm />
            {mailHref ? (
              <p className="mt-6 flex flex-wrap items-center justify-center gap-1 text-sm text-muted">
                {t('contact.orEmail')}
                <a
                  className="rounded-md px-1 py-0.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  href={`${mailHref}?subject=${subject}`}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {mailHref ? (
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-white shadow-sm transition-all duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                href={`${mailHref}?subject=${subject}`}
              >
                <IconMail size={18} aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
            ) : null}
            <p className="max-w-md text-sm leading-relaxed text-muted">{t('contact.emailNotice')}</p>
          </>
        )}

        <a
          className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          href="/"
        >
          {t('contact.back')}
        </a>
      </div>
    </main>
  );
});