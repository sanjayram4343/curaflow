import React from 'react';

// ==========================================
// BUTTON
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none';

  const variants: Record<string, string> = {
    primary:
      'bg-gray-900 text-white hover:bg-gray-700 focus-visible:ring-gray-900 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:focus-visible:ring-white',
    secondary:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    outline:
      'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800',
    ghost:
      'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-gray-100',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ==========================================
// CARD
// ==========================================
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div
    className={`bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-xl overflow-hidden ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-gray-100 dark:border-[#1f1f1f] ${className}`}>{children}</div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

// ==========================================
// BADGE
// ==========================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300',
    green:   'bg-green-50  text-green-700 dark:bg-green-950/30 dark:text-green-400',
    red:     'bg-red-50    text-red-700   dark:bg-red-950/30   dark:text-red-400',
    amber:   'bg-amber-50  text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    blue:    'bg-blue-50   text-blue-700  dark:bg-blue-950/30  dark:text-blue-400',
    gray:    'bg-gray-50   text-gray-600  dark:bg-neutral-900  dark:text-gray-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ==========================================
// INPUT
// ==========================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full ${icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2.5 text-sm rounded-lg outline-none
            border transition-colors duration-150
            bg-white border-gray-300 text-gray-900 placeholder-gray-400
            focus:border-gray-900 focus:ring-1 focus:ring-gray-900
            dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-100 dark:placeholder-gray-600
            dark:focus:border-gray-300 dark:focus:ring-gray-300
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ==========================================
// SELECT
// ==========================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-3.5 py-2.5 text-sm rounded-lg outline-none
          border transition-colors duration-150
          bg-white border-gray-300 text-gray-900
          focus:border-gray-900 focus:ring-1 focus:ring-gray-900
          dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-100
          dark:focus:border-gray-300
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ==========================================
// DIALOG
// ==========================================
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-2xl shadow-2xl animate-fade-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1f1f1f]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Body */}
          <div className="px-5 py-5 max-h-[75vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};
