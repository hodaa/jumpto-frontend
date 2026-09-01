import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

function Logo() {
  return (
    <a
      className="rounded-lg transition-opacity duration-200 hover:opacity-80 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      href="/"
      aria-label="JumpTo home"
    >
      <img
        className="h-14 w-14 object-contain"
        src="/logo.png"
        alt="JumpTo"
        width="64"
        height="64"
      />
    </a>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <Logo />
      <nav className="mx-auto" aria-label="Primary">
        <a
          className="text-sm font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-900 hover:underline"
          href="#why-jumpto"
        >
          {t('nav.whyJumpto')}
        </a>
      </nav>
      <LanguageToggle />
    </header>
  );
}
