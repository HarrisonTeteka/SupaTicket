import { cn } from '../utils/classNames';

const VARIANTS = {
  primary: 'bg-[#12344d] text-white hover:bg-[#0d273a] shadow-lg',
  secondary: 'bg-gray-100 text-[#12344d] hover:bg-gray-200',
  ghost: 'bg-transparent text-gray-500 hover:text-[#12344d] hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg',
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
