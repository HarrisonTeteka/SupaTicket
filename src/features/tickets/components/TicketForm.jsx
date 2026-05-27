import { useState } from 'react';
import { Input, Textarea } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { AssigneePicker } from './AssigneePicker';
import { TagInput } from './TagInput';
import { CustomerPicker } from '../../customers/components/CustomerPicker';
import { customerSummary } from '../../customers/customers.utils';
import { useAppConfig } from '../../admin/hooks/useAppConfig';
import { TICKET_PRIORITIES } from '../tickets.utils';

/**
 * Shared create/edit form for a ticket. `initial` seeds the fields (and may
 * carry a `parent_id` for sub-tickets). Categories and custom fields come
 * from app_config via useAppConfig, so admin edits propagate live.
 */
export function TicketForm({
  initial = {},
  onSubmit,
  submitting = false,
  submitLabel = 'Create ticket',
  onCancel,
}) {
  const { config } = useAppConfig();
  const categories = config.categories;
  const customFields = config.custom_fields;

  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [category, setCategory] = useState(initial.category || '');
  const [priority, setPriority] = useState(initial.priority || 'Medium');
  const [assignee, setAssignee] = useState(
    initial.assigned_to
      ? { id: initial.assigned_to, name: initial.assignee_name }
      : null
  );
  const [customer, setCustomer] = useState(initial.customer || null);
  const [customData, setCustomData] = useState(initial.custom_data || {});
  const [tags, setTags] = useState(initial.tags || []);
  const [errors, setErrors] = useState({});

  const setField = (id, value) =>
    setCustomData((prev) => ({ ...prev, [id]: value }));

  const validate = () => {
    const next = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!description.trim()) next.description = 'Description is required.';
    if (!category) next.category = 'Pick a category.';
    customFields.forEach((f) => {
      if (!f.required) return;
      const v = customData[f.id];
      const missing =
        f.type === 'checkbox' ? !v : v === undefined || v === null || v === '';
      if (missing) next[`cf_${f.id}`] = `${f.label} is required.`;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Keep only custom_data keys that match a current field definition.
    const cleanCustomData = {};
    customFields.forEach((f) => {
      if (customData[f.id] !== undefined) cleanCustomData[f.id] = customData[f.id];
    });
    onSubmit({
      title,
      description,
      category,
      priority,
      assigned_to: assignee?.id ?? null,
      assignee_name: assignee?.name ?? null,
      customer_id: customer?.id ?? null,
      parent_id: initial.parent_id ?? null,
      custom_data: cleanCustomData,
      tags,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Title"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Short summary of the issue"
        error={errors.title}
      />
      <Textarea
        label="Description"
        name="description"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's going on?"
        error={errors.description}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          placeholder="Select category"
          options={categories}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          error={errors.category}
        />
        <Select
          label="Priority"
          options={TICKET_PRIORITIES}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      </div>
      <AssigneePicker
        label="Assignee"
        value={assignee?.id}
        valueName={assignee?.name}
        onChange={setAssignee}
      />

      <CustomerPicker
        value={customer?.id}
        valueLabel={customerSummary(customer)}
        onChange={setCustomer}
      />

      <TagInput label="Tags" value={tags} onChange={setTags} />

      {customFields.length > 0 && (
        <div className="space-y-4 pt-3 border-t border-line">
          {customFields.map((f) => (
            <CustomFieldInput
              key={f.id}
              field={f}
              value={customData[f.id]}
              error={errors[`cf_${f.id}`]}
              onChange={setField}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Renders one admin-defined custom field by its type. */
function CustomFieldInput({ field, value, error, onChange }) {
  const label = field.required ? `${field.label} *` : field.label;

  if (field.type === 'checkbox') {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm font-bold text-fg">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(field.id, e.target.checked)}
          />
          {label}
        </label>
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <Select
        label={label}
        placeholder="Select..."
        options={field.options || []}
        value={value ?? ''}
        error={error}
        onChange={(e) => onChange(field.id, e.target.value)}
      />
    );
  }

  const inputType =
    field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';

  return (
    <Input
      label={label}
      type={inputType}
      value={value ?? ''}
      error={error}
      onChange={(e) => onChange(field.id, e.target.value)}
    />
  );
}
