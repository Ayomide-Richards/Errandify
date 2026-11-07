import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'danger-light' | 'purple-light' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
      md: 'px-4 py-2.5 text-sm font-medium rounded-xl gap-2',
      lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
    }[size];

    const variantClasses = {
      primary:
        'bg-[#5E17EB] text-white hover:bg-[#4E12C6] active:bg-[#410EB0] shadow-sm shadow-[#5E17EB]/25 focus-visible:ring-2 focus-visible:ring-[#5E17EB]/40 disabled:opacity-50 disabled:pointer-events-none',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none',
      outline:
        'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50 disabled:pointer-events-none shadow-sm',
      danger:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-sm shadow-red-500/20 focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 disabled:pointer-events-none',
      'danger-light':
        'bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] active:bg-[#FCA5A5] border border-[#FCA5A5]/60 disabled:opacity-50 disabled:pointer-events-none',
      'purple-light':
        'bg-[#EDE9FE] text-[#5E17EB] hover:bg-[#DDD6FE] active:bg-[#C4B5FD] border border-[#C4B5FD]/60 disabled:opacity-50 disabled:pointer-events-none',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50 disabled:pointer-events-none',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none outline-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

