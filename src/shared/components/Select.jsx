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
  children,
  ...rest
}) {
  const selectId = id || rest.name;
  return (
    <div>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#F58202]',
          'bg-gray-50 focus:bg-white transition-all',
          error ? 'border-red-300' : 'border-gray-200',
          className
        )}
        {...rest}
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
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
