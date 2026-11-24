export const Badge = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
  const variantStyles = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    primary: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium',
    lg: 'text-sm px-3 py-1.5 rounded-full font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border leading-none transition-colors ${variantStyles[variant] || variantStyles.neutral} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, size = 'md' }) => {
  let variant;
  switch (status) {
    case 'Submitted':
      variant = 'neutral';
      break;
    case 'Verified':
      variant = 'info';
      break;
    case 'Forwarded':
      variant = 'primary';
      break;
    case 'Acknowledged':
      variant = 'purple';
      break;
    case 'In Progress':
      variant = 'warning';
      break;
    case 'Reported Resolved':
    case 'Verified Resolved':
      variant = 'success';
      break;
    default:
      variant = 'neutral';
  }

  return (
    <Badge variant={variant} size={size}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-pulse" />
      {status}
    </Badge>
  );
};

export const PriorityBadge = ({ priority, size = 'md' }) => {
  let variant = 'neutral';
  if (priority === 'High' || priority === 'Critical') variant = 'danger';
  else if (priority === 'Medium') variant = 'warning';
  else if (priority === 'Low') variant = 'neutral';

  return (
    <Badge variant={variant} size={size}>
      {priority}
    </Badge>
  );
};
