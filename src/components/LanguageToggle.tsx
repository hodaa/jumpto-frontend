import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage, setLanguage } from '../i18n';
import type { Language } from '../i18n';

const OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

/** Globe dropdown that switches the UI between Arabic and English. */
export function LanguageToggle() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = getLanguage() === 'ar' ? 'ar' : 'en';
  const currentLabel = OPTIONS.find((o) => o.value === current)?.label ?? 'English';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (value: Language) => {
    setLanguage(value);
    setOpen(false);
  };

  const optionId = (value: Language) => `lang-option-${value}`;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('actions.languageSelector')}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon />
        <span>{currentLabel}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={t('actions.languageSelector')}
          className="absolute end-0 z-10 mt-2 min-w-44 rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === current;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  id={optionId(option.value)}
                  aria-selected={selected}
                  aria-current={selected}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-sm font-semibold transition-colors duration-150 hover:bg-slate-100 ${
                    selected ? 'text-primary' : 'text-slate-700'
                  }`}
                  onClick={() => select(option.value)}
                >
                  <span className={option.value === 'ar' ? 'u-ar-font' : undefined}>
                    {option.label}
                  </span>
                  {selected ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
