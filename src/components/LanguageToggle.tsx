import { useTranslation } from 'react-i18next';
import { getLanguage, setLanguage } from '../i18n';

/** Button that toggles the UI between Arabic and English. */
export function LanguageToggle() {
  const { t } = useTranslation();

  const toggle = () => {
    setLanguage(getLanguage() === 'ar' ? 'en' : 'ar');
  };

  return (
    <button type="button" className="lang-toggle" onClick={toggle}>
      {t('actions.language')}
    </button>
  );
}
