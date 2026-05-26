import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useExport } from '../hooks/useExport';
import {
  downloadCsv,
  fetchTicketsForExport,
  toCsv,
} from '../services/exportService';
import { listAllTags } from '../../tickets/services/ticketsService';
import { useAppConfig } from '../../admin/hooks/useAppConfig';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../tickets/tickets.utils';
import { Select } from '../../../shared/components/Select';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';

const COLUMNS = [
  { key: 'ticket_number', label: 'Ticket #' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'category', label: 'Category' },
  { key: 'tags', label: 'Tags' },
  { key: 'creator_name', label: 'Raised by' },
  { key: 'creator_role', label: 'Creator role' },
  { key: 'assignee_name', label: 'Assigned to' },
  { key: 'created_at', label: 'Created at' },
  { key: 'first_response_at', label: 'First response at' },
  { key: 'resolved_at', label: 'Resolved at' },
  { key: 'satisfaction_rating', label: 'CSAT' },
];

/** Ticket export filters + Download CSV button. */
export function TicketExportPanel() {
  const { config } = useAppConfig();
  const { busy, error, run } = useExport();
  const [filters, setFilters] = useState({});
  const [tags, setTags] = useState([]);
  const [rowCount, setRowCount] = useState(null);

  useEffect(() => {
    listAllTags()
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  const set = (key) => (e) => {
    const next = { ...filters };
    if (e.target.value) next[key] = e.target.value;
    else delete next[key];
    setFilters(next);
    setRowCount(null);
  };

  const exportNow = () =>
    run(async () => {
      const rows = await fetchTicketsForExport(filters);
      setRowCount(rows.length);
      const csv = toCsv(rows, COLUMNS);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`supaticket-tickets-${stamp}.csv`, csv);
    });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[#336021] uppercase tracking-wide">
          Export tickets
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Download a CSV of tickets matching the filters below.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
          options={config.categories}
          value={filters.category || ''}
          onChange={set('category')}
        />
        <Select
          label="Tag"
          placeholder="Any tag"
          options={tags}
          value={filters.tag || ''}
          onChange={set('tag')}
        />
        <Select
          label="Creator role"
          placeholder="Any role"
          options={['admin', 'staff', 'customer']}
          value={filters.creator_role || ''}
          onChange={set('creator_role')}
        />
        <div className="hidden md:block" />
        <Input
          label="Since"
          type="date"
          name="since"
          value={filters.since || ''}
          onChange={set('since')}
        />
        <Input
          label="Before"
          type="date"
          name="before"
          value={filters.before || ''}
          onChange={set('before')}
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {rowCount == null
            ? 'CSV columns: ticket #, title, status, priority, category, tags, raised by, assignee, timestamps, CSAT.'
            : `Last export: ${rowCount} row${rowCount === 1 ? '' : 's'}.`}
        </p>
        <Button onClick={exportNow} loading={busy}>
          <Download size={14} /> Download CSV
        </Button>
      </div>
    </div>
  );
}
