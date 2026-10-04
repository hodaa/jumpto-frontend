import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_EMAIL, CONTACT_FORM_ENDPOINT } from '../config';
import { AuthCard } from './AuthCard';
import { ContactForm } from './ContactForm';
import { IconMail } from './icons';

/**
 * Contact page: a contact form (when configured) plus a mailto fallback.
 *
 * Built on the same `AuthCard` shell as sign-in and register, so a visitor who
 * follows "Contact" from the header lands in the same card-and-heading world
 * they were in a moment ago rather than a differently-shaped page.
 */
export const ContactPage = memo(function ContactPage() {
  const { t } = useTranslation();
  const hasForm = CONTACT_FORM_ENDPOINT.length > 0;
  const mailHref = CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : undefined;
  const subject = encodeURIComponent(t('contact.emailLabel'));

  return (
    <div className="py-10 sm:py-14">
      <AuthCard
        icon={<IconMail size={32} />}
        title={t('contact.title')}
        subtitle={t('contact.lead')}
        footer={
          <p className="text-center text-sm text-muted">
            <a href="/" className="font-semibold text-action hover:underline">
              {t('contact.back')}
            </a>
          </p>
        }
      >
        {hasForm ? (
          <>
            <ContactForm />
            {mailHref ? (
              <p className="flex flex-wrap items-center gap-1 text-sm text-muted">
                {t('contact.orEmail')}
                <a
                  className="rounded-md px-1 py-0.5 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  href={`${mailHref}?subject=${subject}`}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <>
            {mailHref ? (
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-action px-6 py-3 text-base font-bold text-white shadow-sm transition-all duration-200 hover:bg-action/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                href={`${mailHref}?subject=${subject}`}
              >
                <IconMail size={18} aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
            ) : null}
            <p className="text-sm leading-relaxed text-muted">{t('contact.emailNotice')}</p>
          </>
        )}
      </AuthCard>
    </div>
  );
});
