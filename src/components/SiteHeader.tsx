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
        className=" object-contain"
        src="/logo.png"
        alt="JumpTo"
        width="100"
        height="48"
      />
    </a>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3 sm:mb-8 sm:gap-4 sm:pb-4">
      <Logo />
      <nav className="flex items-center gap-4 sm:gap-6" aria-label="Primary">
        <a
          className="text-sm font-semibold text-[#01124e] transition-colors duration-200 hover:text-[#01124e] hover:underline"
          href="#how-it-works"
        >
          {t('nav.howItWorks')}
        </a>
        <a
          className="text-sm font-semibold text-[#01124e] transition-colors duration-200 hover:text-[#01124e] hover:underline"
          href="#why-jumpto"
        >
          {t('nav.whyJumpto')}
        </a>
      </nav>
      <LanguageToggle />
    </header>
  );
}
