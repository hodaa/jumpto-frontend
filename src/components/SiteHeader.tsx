import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

function Logo() {
  return (
    <a
      className="order-1 rounded-lg transition-opacity duration-200 hover:opacity-80 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      href="/"
      aria-label="JumpTo home"
    >
      <img className="object-contain" src="/logo.png" alt="JumpTo" width="100" height="48" />
    </a>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-x-3 border-b border-slate-200 pb-3 sm:mb-8 sm:gap-x-4 sm:pb-4">
      <Logo />
      <div className="order-2 sm:order-3">
        <LanguageToggle />
      </div>
      <nav
        className="order-3 mt-3 flex w-full items-center justify-center gap-6 border-t border-slate-100 pt-3 sm:order-2 sm:ms-auto sm:mt-0 sm:w-auto sm:border-0 sm:pt-0"
        aria-label="Primary"
      >
        <a
          className="rounded px-1 py-1 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          href="#how-it-works"
        >
          {t('nav.howItWorks')}
        </a>
        <a
          className="rounded px-1 py-1 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          href="#why-jumpto"
        >
          {t('nav.whyJumpto')}
        </a>
      </nav>
    </header>
  );
}
