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
    'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-app)] disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none tracking-tight';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
    md: 'px-3.5 py-2 text-sm gap-2 rounded-md',
    lg: 'px-5 py-2.5 text-sm gap-2 rounded-md',
  };

  const variantStyles = {
    primary:
      'btn-variant-steam font-medium',
    cyan:
      'btn-variant-cyan font-semibold',
    steam:
      'btn-variant-steam font-medium',
    secondary:
      'btn-variant-secondary font-medium',
    danger:
      'text-red-500 hover:text-red-600 dark:hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 active:scale-[0.98] font-medium',
    outline:
      'border border-[var(--border-card)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)] active:scale-[0.98] font-medium',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] font-medium',
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
