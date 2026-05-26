import { cn } from '../utils/classNames';

const LABEL = 'text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2';
const FIELD =
  'w-full rounded-xl border outline-none focus:ring-2 focus:ring-[#F58202] bg-gray-50 focus:bg-white transition-all';

/** Single-line text input with optional label, leading icon and error text. */
export function Input({ label, icon: Icon, error, className = '', id, ...rest }) {
  const inputId = id || rest.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={LABEL}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        )}
        <input
          id={inputId}
          className={cn(
            FIELD,
            'py-3 pr-4',
            Icon ? 'pl-11' : 'pl-4',
            error ? 'border-red-300' : 'border-gray-200',
            className
          )}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

/** Multi-line text input, same styling as Input. */
export function Textarea({ label, error, className = '', id, rows = 4, ...rest }) {
  const inputId = id || rest.name;
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
          error ? 'border-red-300' : 'border-gray-200',
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
