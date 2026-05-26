import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { updateCategories } from '../services/appConfigService';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';

/** Categories tab: add/remove the ticket categories in app_config. */
export function CategoriesEditor() {
  const { config, loading } = useAppConfig();
  const categories = config.categories;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const save = async (next) => {
    setError('');
    try {
      await updateCategories(next);
    } catch (err) {
      setError(err.message || 'Could not save categories.');
    }
  };

  const add = (e) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value || categories.includes(value)) {
      setDraft('');
      return;
    }
    save([...categories, value]);
    setDraft('');
  };

  const remove = (c) => save(categories.filter((x) => x !== c));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold text-[#336021] uppercase tracking-wide">
          Ticket Categories
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Shown in the ticket form's category dropdown.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1.5 bg-gray-100 text-[#336021] text-sm font-bold pl-3 pr-1.5 py-1.5 rounded-lg"
            >
              {c}
              <button
                type="button"
                onClick={() => remove(c)}
                className="text-gray-400 hover:text-red-500"
                title={`Remove ${c}`}
              >
                <X size={14} />
              </button>
            </span>
          ))
        )}
      </div>

      <form onSubmit={add} className="flex gap-2">
        <div className="flex-1">
          <Input
            name="category"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New category"
          />
        </div>
        <Button type="submit">
          <Plus size={15} /> Add
        </Button>
      </form>
    </div>
  );
}
