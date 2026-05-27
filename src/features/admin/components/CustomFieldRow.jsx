import { Trash2 } from 'lucide-react';

/** One custom field definition in the Custom Fields builder. */
export function CustomFieldRow({ field, onDelete }) {
  const meta =
    field.type === 'select' && field.options?.length
      ? `${field.type} · ${field.options.join(', ')}`
      : field.type;

  return (
    <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-primary">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        <p className="text-xs text-fg-muted">{meta}</p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(field.id)}
        className="p-1.5 text-fg-muted hover:text-red-500"
        title="Delete field"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
