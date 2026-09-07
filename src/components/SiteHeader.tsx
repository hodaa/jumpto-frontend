import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

const NAV_LINK =
  'rounded-md px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-primary transition-colors duration-200 hover:bg-slate-100 hover:text-action-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20';

function Logo() {
  return (
    <a
      className="order-1 flex shrink-0 items-center rounded-lg transition-opacity duration-200 hover:opacity-80 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:justify-self-start"
      href="/"
      aria-label="قفزه home"
    >
      <img className="h-12 w-auto object-contain" src="/logo.svg" alt="قفزه" width="72" height="48" />
    </a>
  );
}

/**
 * Site header.
 *
 * Mobile (< sm): logo and language switcher share the first row (the switcher
 * is pushed to the inline end), the marketing links wrap to a second row.
 * sm and up: a `1fr auto 1fr` grid — logo track, nav track, switcher track.
 * The two outer tracks are equal, so the nav sits dead centre with the same
 * breathing room on both sides. That replaces the old `ms-auto` +
 * `justify-between` combination, which dumped every leftover pixel into one
 * void between the logo and the links. `1fr` also keeps a min-content floor, so
 * the long Arabic labels can never squeeze the logo or the switcher.
 */
export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-200 pb-3 sm:mb-8 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-y-0 sm:pb-4">
      <Logo />
      <nav
        className="order-3 flex w-full items-center justify-center gap-x-8 border-t border-slate-100 pt-3 sm:order-2 sm:w-auto sm:gap-x-6 sm:border-0 sm:pt-0"
        aria-label="Primary"
      >
        <a className={NAV_LINK} href="#how-it-works">
          {t('nav.howItWorks')}
        </a>
        <a className={NAV_LINK} href="#why-jumpto">
          {t('nav.whyJumpto')}
        </a>
      </nav>
      <div className="order-2 flex flex-1 items-center justify-end sm:order-3 sm:flex-none sm:justify-self-end">
        <LanguageToggle />
      </div>
    </header>
  );
}
