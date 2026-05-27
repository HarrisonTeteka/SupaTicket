import { useId } from 'react';
import { cn } from '../utils/classNames';

/**
 * Native select. `options` accepts plain strings or { value, label } objects.
 * Extra <option> children can be passed instead of / alongside `options`.
 */
export function Select({
  label,
  error,
  options = [],
  placeholder,
  className = '',
  id,
  required,
  children,
  ...rest
}) {
  const reactId = useId();
  const selectId = id || rest.name || reactId;
  const errorId = `${selectId}-error`;
  return (
    <div>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-fg-muted uppercase tracking-widest block mb-2"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-brand-accent',
          'bg-surface-2 focus:bg-surface transition-all',
          error ? 'border-red-300' : 'border-line-strong',
          className
        )}
        {...rest}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
