import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { searchCustomers } from '../services/customerService';
import { CustomerEditModal } from './CustomerEditModal';
import { useDisclosure } from '../../../shared/hooks/useDisclosure';
import { cn } from '../../../shared/utils/classNames';

/**
 * Searchable customer combobox for the ticket form. `value` is the customer
 * id (or null); `onChange` receives the full customer object (or null) so the
 * caller can capture name/company for display.
 */
export function CustomerPicker({ value, valueLabel, onChange, label = 'Customer' }) {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const { isOpen, open, close } = useDisclosure();
  const ref = useRef(null);

  // Debounced search whenever the popover is open and the query changes.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await searchCustomers(query);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen, close]);

  const display = value ? (valueLabel || 'Customer selected') : 'No customer';

  const pick = (customer) => {
    onChange(customer);
    setQuery('');
    close();
  };

  const onCreated = (customer) => {
    setCreating(false);
    pick(customer);
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="text-xs font-black text-fg-muted uppercase tracking-widest block mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={open}
          className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-line-strong bg-surface-2 hover:bg-surface text-sm transition-all"
        >
          <span className={cn('truncate', value ? 'font-bold text-brand-primary' : 'text-fg-muted')}>
            {display}
          </span>
          <ChevronDown size={16} className="text-fg-muted shrink-0" />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => pick(null)}
            className="p-2 rounded-lg text-fg-muted hover:text-red-500 hover:bg-red-50"
            title="Clear customer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full bg-surface rounded-xl border border-line-strong shadow-xl overflow-hidden">
          <div className="relative p-2 border-b border-line">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-8 pr-2 py-1.5 text-sm bg-surface-2 rounded-lg outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-fg-secondary hover:bg-surface-2"
            >
              <X size={14} /> No customer
            </button>
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-2 text-left"
              >
                <span className="truncate min-w-0">
                  <span className="font-bold text-brand-primary">{c.name}</span>
                  {c.company && (
                    <span className="text-fg-secondary text-xs ml-1.5 inline-flex items-center gap-0.5">
                      <Building2 size={11} /> {c.company}
                    </span>
                  )}
                  <span className="block text-[11px] text-fg-muted">
                    {c.email || c.external_id}
                  </span>
                </span>
                {c.id === value && <Check size={14} className="text-emerald-500 shrink-0" />}
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-3 text-xs text-fg-muted">
                {query ? 'No matches' : 'No customers yet'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              close();
              setCreating(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-brand-accent hover:bg-surface-2 border-t border-line"
          >
            <Plus size={14} /> New customer
          </button>
        </div>
      )}

      {creating && (
        <CustomerEditModal
          customer={null}
          onClose={() => setCreating(false)}
          onSaved={onCreated}
        />
      )}
    </div>
  );
}
