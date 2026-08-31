import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}

export function AlertModal({ open, onClose, title, children, actions }: AlertModalProps) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="alert-modal__overlay" onClick={onClose} role="presentation">
      <div
        className="alert-modal__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alert-modal__header">
          <h2 id="alert-modal-title" className="alert-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="alert-modal__close"
            onClick={onClose}
            aria-label={t('actions.dismiss')}
          >
            ×
          </button>
        </div>
        <div className="alert-modal__body">{children}</div>
        <div className="alert-modal__actions">{actions}</div>
      </div>
    </div>
  );
}
