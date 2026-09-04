import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} glass-modal rounded-xl shadow-2xl border border-[var(--border-modal)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-[var(--text-primary)]`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={`flex items-center ${
              title ? 'justify-between px-6 py-4' : 'justify-end px-5 py-3'
            } border-b border-[var(--border-subtle)] bg-[var(--bg-header)]`}
          >
            {typeof title === 'string' ? (
              <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.96] transition-colors cursor-pointer"
                aria-label="창 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
