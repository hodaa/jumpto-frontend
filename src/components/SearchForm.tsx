import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage } from '../i18n';
import { parseYouTubeId } from '../utils/youtube';
import type { SearchLanguage } from '../types';

interface Props {
  onSubmit: (url: string, keyword: string, language: SearchLanguage) => void;
  disabled?: boolean;
  initialUrl?: string;
  initialKeyword?: string;
}

export function SearchForm({
  onSubmit,
  disabled = false,
  initialUrl = '',
  initialKeyword = '',
}: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [language, setLanguage] = useState<SearchLanguage>(getLanguage() === 'ar' ? 'ar' : 'en');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    setKeywordError(null);
    const cleanUrl = url.trim();
    const cleanKeyword = keyword.trim();

    const hasUrlError = !cleanUrl || !parseYouTubeId(cleanUrl);
    const hasKeywordError = !cleanKeyword;

    if (hasUrlError) {
      setUrlError(cleanUrl ? t('error.invalidUrl') : t('error.urlRequired'));
    }
    if (hasKeywordError) {
      setKeywordError(t('error.keywordRequired'));
    }
    if (hasUrlError || hasKeywordError) {
      return;
    }
    onSubmit(cleanUrl, cleanKeyword, language);
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} aria-label={t('form.title')}>
      <div className="field field--full">
        <label className="field__label" htmlFor="url">
          {t('form.urlLabel')}
        </label>
        <input
          id="url"
          type="url"
          dir="ltr"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t('form.urlPlaceholder')}
          aria-describedby={urlError ? 'url-error' : undefined}
          aria-invalid={urlError ? true : undefined}
        />
        {urlError ? (
          <p className="field__error" role="alert" id="url-error">
            {urlError}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="keyword">
          {t('form.keywordLabel')}
        </label>
        <input
          id="keyword"
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('form.keywordPlaceholder')}
          aria-describedby={keywordError ? 'keyword-error' : undefined}
          aria-invalid={keywordError ? true : undefined}
        />
        {keywordError ? (
          <p className="field__error" role="alert" id="keyword-error">
            {keywordError}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="language">
          {t('form.languageLabel')}
        </label>
        <select
          id="language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as SearchLanguage)}
        >
          <option value="en">{t('form.languageEn')}</option>
          <option value="ar">{t('form.languageAr')}</option>
        </select>
      </div>
      <button type="submit" className="submit-button" disabled={disabled}>
        {disabled ? t('form.searching') : t('form.submit')}
      </button>
    </form>
  );
}
