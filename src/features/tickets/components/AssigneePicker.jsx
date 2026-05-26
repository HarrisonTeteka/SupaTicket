import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, UserX } from 'lucide-react';
import { listAssignees } from '../services/ticketsService';
import { useDisclosure } from '../../../shared/hooks/useDisclosure';
import { cn } from '../../../shared/utils/classNames';

/**
 * Searchable dropdown over active profiles. `value` is the selected profile
 * id; `onChange` receives the full profile object (or `null` for unassigned)
 * so callers can stamp both `assigned_to` and `assignee_name`.
 */
export function AssigneePicker({ value, valueName, onChange, label, disabled }) {
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState('');
  const { isOpen, toggle, close } = useDisclosure();
  const ref = useRef(null);

  useEffect(() => {
    listAssignees()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen, close]);

  const selected = people.find((p) => p.id === value);
  const display = selected?.name || valueName || 'Unassigned';
  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const pick = (person) => {
    onChange(person);
    setQuery('');
    close();
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={cn('font-medium', selected ? 'text-[#336021]' : 'text-gray-400')}>
          {display}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="relative p-2 border-b border-gray-100">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 rounded-lg outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              <UserX size={14} /> Unassigned
            </button>
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="truncate">
                  <span className="font-bold text-[#336021]">{p.name}</span>{' '}
                  <span className="text-gray-400 text-xs">{p.email}</span>
                </span>
                {p.id === value && <Check size={14} className="text-emerald-500 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
