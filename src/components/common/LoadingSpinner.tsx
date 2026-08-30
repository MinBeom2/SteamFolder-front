import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <Loader2 className={`${sizeMap[size]} animate-spin text-[#00F0FF]`} />
        <div className="absolute inset-0 blur-md opacity-40 bg-[#00F0FF] rounded-full animate-pulse" />
      </div>
      {label && (
        <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};
