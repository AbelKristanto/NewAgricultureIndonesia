import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingLabel?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, loading = false, loadingLabel, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-500': variant === 'primary',
            'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500': variant === 'secondary',
            'border-2 border-primary-700 text-primary-700 hover:bg-primary-50 focus:ring-primary-500': variant === 'outline',
            'text-primary-700 hover:bg-primary-50 focus:ring-primary-500': variant === 'ghost',
            'bg-danger-600 text-white hover:bg-danger-500 focus:ring-danger-500': variant === 'danger',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner size="sm" />
            {loadingLabel || children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
