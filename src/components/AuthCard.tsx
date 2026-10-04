import type { ReactNode } from 'react';

/**
 * The shell every standalone page sits in: an accent glyph, the brand-bar
 * heading, a lead line, then the content in a raised white card.
 *
 * Lives outside `auth/` because ContactPage uses it too — the sign-in flow and
 * the contact form should not look like two different products. Sharing the one
 * component is what keeps them identical; duplicating these class lists into
 * both pages is how they drift apart in the first place.
 */
export function AuthCard({
  icon,
  title,
  subtitle,
  children,
  footer,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center">
      {icon ? (
        <span className="text-accent animate-fade-in" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <h1 className="section-title animate-fade-in">{title}</h1>
      {subtitle ? (
        <p className="text-muted-strong max-w-md text-lg font-medium leading-relaxed">{subtitle}</p>
      ) : null}
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-start shadow-xl ring-1 ring-slate-900/5 transition-shadow hover:shadow-2xl sm:p-8 animate-fade-in-up">
        <div className="space-y-5">{children}</div>
        {footer ? <div className="mt-6 border-t border-border pt-5">{footer}</div> : null}
      </div>
    </div>
  );
}
