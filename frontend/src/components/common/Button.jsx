import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-[#164DAA] hover:bg-[#123E8A] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white shadow-sm focus:ring-[#164DAA]',
    secondary:
      'bg-[#F5F7FB] hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#172033] dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 focus:ring-slate-400',
    outline:
      'border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-[#172033] dark:text-[#F8FAFC] focus:ring-[#164DAA]',
    accent:
      'bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#60A5FA] dark:hover:bg-[#3B82F6] text-white shadow-sm focus:ring-[#2563EB]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[#172033] dark:text-[#F8FAFC] focus:ring-slate-400',
    sidebar:
      'bg-white/10 hover:bg-white/15 text-white focus:ring-white/40',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
