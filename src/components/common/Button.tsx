import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cyan' | 'steam' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#07090e] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#00F0FF] text-[#07090e] font-semibold hover:bg-[#33f3ff] hover:shadow-[0_0_16px_rgba(0,240,255,0.4)] focus:ring-[#00F0FF]',
    cyan:
      'bg-[#00F0FF] text-[#07090e] font-bold hover:bg-[#33f3ff] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] focus:ring-[#00F0FF]',
    steam:
      'bg-[#1976d2] text-white hover:bg-[#1565c0] hover:shadow-[0_0_15px_rgba(25,118,210,0.4)] focus:ring-[#1976d2]',
    secondary:
      'bg-[#1e293b] text-slate-200 border border-slate-700 hover:bg-[#334155] hover:text-white focus:ring-slate-500',
    danger:
      'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 focus:ring-red-500',
    outline:
      'border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-400',
    ghost:
      'text-slate-400 hover:text-slate-100 hover:bg-white/5 focus:ring-slate-400',
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
