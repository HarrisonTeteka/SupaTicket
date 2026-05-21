import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { updateDepartments } from '../services/appConfigService';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';

/** Departments tab: add/remove the departments in app_config. */
export function DepartmentsEditor() {
  const { config, loading } = useAppConfig();
  const departments = config.departments;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const save = async (next) => {
    setError('');
    try {
      await updateDepartments(next);
    } catch (err) {
      setError(err.message || 'Could not save departments.');
    }
  };

  const add = (e) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value || departments.includes(value)) {
      setDraft('');
      return;
    }
    save([...departments, value]);
    setDraft('');
  };

  const remove = (d) => save(departments.filter((x) => x !== d));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-black text-[#12344d] uppercase tracking-wide">
          Departments
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Assignable to staff in the Staff Directory.
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
        ) : departments.length === 0 ? (
          <p className="text-sm text-gray-400">No departments yet.</p>
        ) : (
          departments.map((d) => (
            <span
              key={d}
              className="flex items-center gap-1.5 bg-gray-100 text-[#12344d] text-sm font-bold pl-3 pr-1.5 py-1.5 rounded-lg"
            >
              {d}
              <button
                type="button"
                onClick={() => remove(d)}
                className="text-gray-400 hover:text-red-500"
                title={`Remove ${d}`}
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
            name="department"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New department"
          />
        </div>
        <Button type="submit">
          <Plus size={15} /> Add
        </Button>
      </form>
    </div>
  );
}
