import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { useCategories } from '../hooks/useCategories';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../tickets.utils';

/**
 * Status / priority / category / assignee filter row for the tickets list.
 * Controlled: `filters` is owned by the page, `onChange` receives the next
 * filters object (keys omitted when "all" is selected).
 */
export function TicketFilters({ filters, onChange, assignees = [] }) {
  const categories = useCategories();

  const set = (key) => (e) => {
    const next = { ...filters };
    if (e.target.value) next[key] = e.target.value;
    else delete next[key];
    onChange(next);
  };

  const hasFilters = Boolean(
    filters.status || filters.priority || filters.category || filters.assigned_to
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <Select
          label="Status"
          placeholder="All statuses"
          options={TICKET_STATUSES}
          value={filters.status || ''}
          onChange={set('status')}
        />
      </div>
      <div className="w-40">
        <Select
          label="Priority"
          placeholder="All priorities"
          options={TICKET_PRIORITIES}
          value={filters.priority || ''}
          onChange={set('priority')}
        />
      </div>
      <div className="w-44">
        <Select
          label="Category"
          placeholder="All categories"
          options={categories}
          value={filters.category || ''}
          onChange={set('category')}
        />
      </div>
      <div className="w-52">
        <Select
          label="Assignee"
          placeholder="Anyone"
          options={assignees.map((a) => ({ value: a.id, label: a.name }))}
          value={filters.assigned_to || ''}
          onChange={set('assigned_to')}
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" onClick={() => onChange({})}>
          Clear
        </Button>
      )}
    </div>
  );
}
