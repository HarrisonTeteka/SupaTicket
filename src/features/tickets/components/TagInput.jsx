import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Free-form tag chip input. `value` is a string[]; `onChange` receives the
 * next array. Press Enter or comma to add the typed value; X removes a chip;
 * Backspace on an empty input removes the last chip.
 */
export function TagInput({ value = [], onChange, label, placeholder = 'Add tag...', disabled }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...value, v]);
    setDraft('');
  };

  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-widest block mb-2">
          {label}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-xl border border-line-strong bg-surface-2 focus-within:ring-2 focus-within:ring-brand-accent focus-within:bg-surface transition-all">
        {value.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-xs font-bold pl-2 pr-1 py-0.5 rounded-md"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              disabled={disabled}
              className="text-brand-primary hover:text-brand-danger disabled:pointer-events-none"
              title={`Remove ${t}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm py-1.5 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
