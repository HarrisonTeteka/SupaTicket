import { useState } from 'react';
import { Input, Textarea } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { AssigneePicker } from './AssigneePicker';
import { useCategories } from '../hooks/useCategories';
import { TICKET_PRIORITIES } from '../tickets.utils';

/**
 * Shared create/edit form for a ticket. `initial` seeds the fields (and may
 * carry a `parent_id` for sub-tickets). `onSubmit` receives a clean values
 * object; the caller owns the network call and the `submitting` flag.
 */
export function TicketForm({
  initial = {},
  onSubmit,
  submitting = false,
  submitLabel = 'Create ticket',
  onCancel,
}) {
  const categories = useCategories();
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [category, setCategory] = useState(initial.category || '');
  const [priority, setPriority] = useState(initial.priority || 'Medium');
  const [assignee, setAssignee] = useState(
    initial.assigned_to
      ? { id: initial.assigned_to, name: initial.assignee_name }
      : null
  );
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!description.trim()) next.description = 'Description is required.';
    if (!category) next.category = 'Pick a category.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title,
      description,
      category,
      priority,
      assigned_to: assignee?.id ?? null,
      assignee_name: assignee?.name ?? null,
      parent_id: initial.parent_id ?? null,
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
      <div className="grid grid-cols-2 gap-4">
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
