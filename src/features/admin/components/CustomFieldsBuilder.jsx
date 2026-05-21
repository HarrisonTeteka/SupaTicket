import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { updateCustomFields } from '../services/appConfigService';
import { CustomFieldRow } from './CustomFieldRow';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';

const FIELD_TYPES = ['text', 'number', 'select', 'date', 'checkbox'];

/**
 * Custom Fields tab: define the extra fields rendered on the ticket form.
 * Deleting a field leaves existing tickets' custom_data untouched.
 */
export function CustomFieldsBuilder() {
  const { config, loading } = useAppConfig();
  const fields = config.custom_fields;

  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState('');
  const [error, setError] = useState('');

  const save = async (next) => {
    setError('');
    try {
      await updateCustomFields(next);
    } catch (err) {
      setError(err.message || 'Could not save custom fields.');
    }
  };

  const add = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Field label is required.');
      return;
    }
    const parsedOptions =
      type === 'select'
        ? options.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
    if (type === 'select' && parsedOptions.length === 0) {
      setError('Select fields need at least one option.');
      return;
    }
    const field = {
      id: crypto.randomUUID(),
      label: label.trim(),
      type,
      required,
      options: parsedOptions,
    };
    save([...fields, field]);
    setLabel('');
    setType('text');
    setRequired(false);
    setOptions('');
  };

  const remove = (id) => save(fields.filter((f) => f.id !== id));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-black text-[#12344d] uppercase tracking-wide">
          Custom Ticket Fields
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Extra fields shown on the ticket form. Deleting a field keeps existing
          ticket data.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-gray-400">No custom fields yet.</p>
        ) : (
          fields.map((f) => <CustomFieldRow key={f.id} field={f} onDelete={remove} />)
        )}
      </div>

      <form onSubmit={add} className="space-y-3 pt-3 border-t border-gray-100">
        <Input
          label="Field label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Affected site"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            options={FIELD_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm font-bold text-gray-600 pb-3 self-end">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            Required
          </label>
        </div>
        {type === 'select' && (
          <Input
            label="Options (comma-separated)"
            name="options"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="Lusaka, Ndola"
          />
        )}
        <div className="flex justify-end">
          <Button type="submit">
            <Plus size={15} /> Add field
          </Button>
        </div>
      </form>
    </div>
  );
}
