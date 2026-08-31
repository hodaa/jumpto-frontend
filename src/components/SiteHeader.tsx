import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

function Logo() {
  return (
    <a className="brand-logo-link" href="/" aria-label="JumpTo home">
      <img className="brand-logo" src="/logo.png" alt="JumpTo" width="64" height="64" />
    </a>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="site-header">
      <div className="site-header__left">
        <Logo />
        <a className="site-nav-link" href="#why-jumpto">
          {t('nav.whyJumpto')}
        </a>
      </div>
      <LanguageToggle />
    </header>
  );
}
