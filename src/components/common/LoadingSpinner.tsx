import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
  glow?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
  glow = false,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div role="status" aria-label={label || '불러오는 중'} className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div aria-hidden="true" className="relative flex items-center justify-center">
        <Loader2 className={`${sizeMap[size]} animate-spin text-[var(--primary-accent)]`} />
        {glow && (
          <div className="absolute inset-0 blur-md opacity-20 bg-[var(--primary-accent)] rounded-full animate-pulse pointer-events-none" />
        )}
      </div>
      {label && (
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium tracking-wide">
          {label}
        </p>
      )}
    </div>
  );
};
