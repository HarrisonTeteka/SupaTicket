import { useId } from 'react';
import { cn } from '../utils/classNames';

const LABEL = 'text-xs font-semibold text-fg-muted uppercase tracking-widest block mb-2';
const FIELD =
  'w-full rounded-xl border outline-none focus:ring-2 focus:ring-brand-accent bg-surface-2 focus:bg-surface transition-all';

/** Single-line text input with optional label, leading icon and error text. */
export function Input({ label, icon: Icon, error, className = '', id, required, ...rest }) {
  const reactId = useId();
  const inputId = id || rest.name || reactId;
  const errorId = `${inputId}-error`;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={LABEL}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
        )}
        <input
          id={inputId}
          className={cn(
            FIELD,
            'py-3 pr-4',
            Icon ? 'pl-11' : 'pl-4',
            error ? 'border-red-300' : 'border-line-strong',
            className
          )}
          {...rest}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

/** Multi-line text input, same styling as Input. */
export function Textarea({ label, error, className = '', id, rows = 4, required, ...rest }) {
  const reactId = useId();
  const inputId = id || rest.name || reactId;
  const errorId = `${inputId}-error`;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={LABEL}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          FIELD,
          'px-4 py-3 resize-y',
          error ? 'border-red-300' : 'border-line-strong',
          className
        )}
        {...rest}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
