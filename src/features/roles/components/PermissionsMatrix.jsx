import { PERMISSION_CATEGORIES } from '../roles.utils';

/**
 * Categorised checkbox grid. `value` is a flat `{ key: bool }` object; the
 * `onChange(next)` callback gets a fresh object each time a checkbox flips.
 * `readOnly` disables all checkboxes (used for the legacy system role view).
 */
export function PermissionsMatrix({ value = {}, onChange, readOnly = false }) {
  const set = (key) => (e) => {
    onChange({ ...value, [key]: e.target.checked });
  };

  const setCategory = (cat, on) => {
    const next = { ...value };
    for (const p of PERMISSION_CATEGORIES[cat]) next[p.key] = on;
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
        const allOn = perms.every((p) => value[p.key]);
        const noneOn = perms.every((p) => !value[p.key]);
        return (
          <div key={category} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-[#336021] uppercase tracking-widest">
                {category}
              </h4>
              {!readOnly && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    disabled={allOn}
                    onClick={() => setCategory(category, true)}
                    className="text-[#336021] font-bold hover:underline disabled:opacity-30 disabled:no-underline"
                  >
                    All
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    type="button"
                    disabled={noneOn}
                    onClick={() => setCategory(category, false)}
                    className="text-gray-500 hover:underline disabled:opacity-30 disabled:no-underline"
                  >
                    None
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {perms.map((p) => (
                <label
                  key={p.key}
                  className={`flex items-start gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 transition-colors ${
                    readOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!value[p.key]}
                    onChange={set(p.key)}
                    disabled={readOnly}
                    className="mt-0.5"
                  />
                  <span className="text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
