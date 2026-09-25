import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_FORM_ENDPOINT } from '../config';

const MAX_MESSAGE = 500;

type Field = 'name' | 'email' | 'message';
type FieldError = 'required' | 'invalid' | null;
type SubmitState = 'idle' | 'sending' | 'done' | 'error';

function validateName(value: string): FieldError {
  return value.trim() ? null : 'required';
}

function validateEmail(value: string): FieldError {
  if (!value.trim()) return 'required';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : 'invalid';
}

function validateMessage(value: string): FieldError {
  return value.trim() ? null : 'required';
}

const FIELD_ERROR_MAP: Record<Field, { required: string; invalid?: string }> = {
  name: { required: 'contact.form.requiredName' },
  email: { required: 'contact.form.requiredEmail', invalid: 'contact.form.invalidEmail' },
  message: { required: 'contact.form.requiredMessage' },
};

function fieldStateClass(hasError: boolean): string {
  return hasError
    ? 'border-danger bg-danger-soft focus:border-danger focus:ring-danger'
    : 'border-slate-200 bg-slate-50 focus:border-action focus:ring-action';
}

/** Contact form that posts JSON to a form service (e.g. Formspree). */
export function ContactForm() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<Field, FieldError>>({
    name: null,
    email: null,
    message: null,
  });
  const [state, setState] = useState<SubmitState>('idle');
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const resolveError = (field: Field): string | null => {
    const code = errors[field];
    if (!code) return null;
    const entry = FIELD_ERROR_MAP[field][code];
    return entry ? t(entry) : null;
  };

  const onFieldChange = (field: Field, value: string) => {
    if (field === 'name') setName(value);
    if (field === 'email') setEmail(value);
    if (field === 'message') setMessage(value);
    setErrors((current) => ({ ...current, [field]: null }));
    setState((current) => (current === 'done' || current === 'error' ? 'idle' : current));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<Field, FieldError> = {
      name: validateName(name),
      email: validateEmail(email),
      message: validateMessage(message),
    };
    setErrors(next);
    const order: Field[] = ['name', 'email', 'message'];
    const firstInvalid = order.find((field) => next[field] !== null);
    if (firstInvalid) {
      if (firstInvalid === 'name') nameRef.current?.focus();
      if (firstInvalid === 'email') emailRef.current?.focus();
      if (firstInvalid === 'message') messageRef.current?.focus();
      return;
    }
    setState('sending');
    try {
      const response = await fetch(CONTACT_FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!response.ok) throw new Error(`form service responded ${response.status}`);
      setState('done');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setState('error');
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-500 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 ${fieldStateClass(hasError)}`;
  const labelClass = 'block text-sm font-semibold text-muted-strong';
  const errorId = (field: Field) => `contact-${field}-error`;

  return (
    <form className="w-full max-w-xl text-start" onSubmit={handleSubmit} noValidate>
      {state === 'done' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-lg font-semibold text-brand">{t('contact.form.success')}</p>
          <button
            type="button"
            className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            onClick={() => setState('idle')}
          >
            {t('contact.form.sendAnother')}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="contact-name">
                {t('contact.form.nameLabel')}
              </label>
              <input
                id="contact-name"
                ref={nameRef}
                className={`mt-2 ${inputClass(errors.name !== null)}`}
                value={name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                placeholder={t('contact.form.namePlaceholder')}
                aria-invalid={errors.name !== null}
                aria-describedby={errors.name ? errorId('name') : undefined}
              />
              {errors.name ? (
                <p id={errorId('name')} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
                  {resolveError('name')}
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelClass} htmlFor="contact-email">
                {t('contact.form.emailLabel')}
              </label>
              <input
                id="contact-email"
                ref={emailRef}
                type="email"
                className={`mt-2 ${inputClass(errors.email !== null)}`}
                value={email}
                onChange={(e) => onFieldChange('email', e.target.value)}
                placeholder={t('contact.form.emailPlaceholder')}
                aria-invalid={errors.email !== null}
                aria-describedby={errors.email ? errorId('email') : undefined}
              />
              {errors.email ? (
                <p id={errorId('email')} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
                  {resolveError('email')}
                </p>
              ) : null}
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <label className={labelClass} htmlFor="contact-message">
                  {t('contact.form.messageLabel')}
                </label>
                <span className="text-xs tabular-nums text-muted">
                  {t('contact.form.messageCount', { count: message.length, max: MAX_MESSAGE })}
                </span>
              </div>
              <textarea
                id="contact-message"
                ref={messageRef}
                className={`mt-2 min-h-32 resize-y ${inputClass(errors.message !== null)}`}
                value={message}
                maxLength={MAX_MESSAGE}
                onChange={(e) => onFieldChange('message', e.target.value)}
                placeholder={t('contact.form.messagePlaceholder')}
                aria-invalid={errors.message !== null}
                aria-describedby={errors.message ? errorId('message') : undefined}
              />
              {errors.message ? (
                <p id={errorId('message')} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
                  {resolveError('message')}
                </p>
              ) : null}
            </div>
          </div>
          {state === 'error' ? (
            <p role="alert" className="mt-4 text-sm font-medium text-danger">
              {t('contact.form.error')}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-white transition-all duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === 'sending' ? t('contact.form.sending') : t('contact.form.submit')}
          </button>
        </>
      )}
    </form>
  );
}