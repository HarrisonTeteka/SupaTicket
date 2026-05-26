import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { useAppConfig } from '../../admin/hooks/useAppConfig';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../tickets.utils';

/**
 * Status / priority / category / assignee / tag filter row.
 * Responsive grid — 2 cols on mobile, 3 on tablet, 5 on desktop.
 */
export function TicketFilters({ filters, onChange, assignees = [], tags = [] }) {
  const { config } = useAppConfig();
  const categories = config.categories;

  const set = (key) => (e) => {
    const next = { ...filters };
    if (e.target.value) next[key] = e.target.value;
    else delete next[key];
    onChange(next);
  };

  const hasFilters = Boolean(
    filters.status ||
      filters.priority ||
      filters.category ||
      filters.assigned_to ||
      filters.tag
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Select
          label="Status"
          placeholder="All statuses"
          options={TICKET_STATUSES}
          value={filters.status || ''}
          onChange={set('status')}
        />
        <Select
          label="Priority"
          placeholder="All priorities"
          options={TICKET_PRIORITIES}
          value={filters.priority || ''}
          onChange={set('priority')}
        />
        <Select
          label="Category"
          placeholder="All categories"
          options={categories}
          value={filters.category || ''}
          onChange={set('category')}
        />
        <Select
          label="Assignee"
          placeholder="Anyone"
          options={assignees.map((a) => ({ value: a.id, label: a.name }))}
          value={filters.assigned_to || ''}
          onChange={set('assigned_to')}
        />
        <Select
          label="Tag"
          placeholder="Any tag"
          options={tags}
          value={filters.tag || ''}
          onChange={set('tag')}
        />
      </div>
      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onChange({})}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
