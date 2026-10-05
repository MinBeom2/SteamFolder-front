import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
  zIndex?: number;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  zIndex = 50,
  className = '',
  ariaLabel,
  ariaDescribedBy,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    (focusable || dialogRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      const openModals = document.querySelectorAll('[data-app-modal]');
      if (openModals[openModals.length - 1] !== rootRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
        ));
        if (items.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div
      ref={rootRef}
      data-app-modal="true"
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-describedby={ariaDescribedBy}
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel || '대화상자' : undefined}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden ${maxWidthStyles[maxWidth]} glass-modal rounded-[4px] border border-[var(--border-modal)] text-[var(--text-primary)] shadow-[var(--soft-shadow)] animate-in fade-in slide-in-from-bottom-2 duration-300 sm:max-h-[calc(100dvh-2rem)] ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={`flex items-center ${
              title ? 'justify-between px-4 py-4 sm:px-6' : 'justify-end px-4 py-3 sm:px-5'
            } border-b border-[var(--border-subtle)] bg-[var(--bg-header)]`}
          >
            {title && (
              <div id={titleId} className="min-w-0 flex-1">
                {typeof title === 'string' ? (
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
                ) : title}
              </div>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--primary-accent)] dark:hover:bg-white/5 cursor-pointer"
                aria-label="창 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
