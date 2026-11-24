import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] rounded-xl shadow-xs transition-all ${
        hoverEffect ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`p-5 pb-3 border-b border-slate-100 dark:border-[#263449] flex items-center justify-between gap-4 ${className}`}>
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-[#172033] dark:text-[#F8FAFC]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardBody = ({ children, className = '' }) => {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`p-4 px-5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-[#263449] rounded-b-xl flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
};
