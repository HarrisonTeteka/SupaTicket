import { cn } from '../utils/classNames';

const VARIANTS = {
  primary: 'bg-brand-accent text-white hover:bg-brand-accent-hover shadow-lg shadow-brand-accent/30',
  secondary: 'bg-surface-2 text-brand-primary hover:bg-line-strong',
  ghost: 'bg-transparent text-fg-secondary hover:text-brand-primary hover:bg-surface-2',
  danger: 'bg-brand-danger text-white hover:bg-[#7e2122] shadow-lg shadow-brand-danger/30',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

/**
 * Brand button. `loading` disables the button and swaps the label.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  loading = false,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? 'Working...' : children}
    </button>
  );
}
