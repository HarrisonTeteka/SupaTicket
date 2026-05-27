import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useExport } from '../hooks/useExport';
import {
  downloadCsv,
  fetchLogsForExport,
  toCsv,
} from '../services/exportService';
import { listActionTypes } from '../../admin/services/systemLogsService';
import { Select } from '../../../shared/components/Select';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';

const COLUMNS = [
  { key: 'created_at', label: 'When' },
  { key: 'action_type', label: 'Action' },
  { key: 'user_name', label: 'By' },
  { key: 'user_id', label: 'User ID' },
  { key: 'details', label: 'Details' },
];

/** System logs export filters + Download CSV button. */
export function LogExportPanel() {
  const { busy, error, run } = useExport();
  const [filters, setFilters] = useState({});
  const [actionTypes, setActionTypes] = useState([]);
  const [rowCount, setRowCount] = useState(null);

  useEffect(() => {
    listActionTypes()
      .then(setActionTypes)
      .catch(() => setActionTypes([]));
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
      const rows = await fetchLogsForExport(filters);
      setRowCount(rows.length);
      const csv = toCsv(rows, COLUMNS);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`supaticket-logs-${stamp}.csv`, csv);
    });

  return (
    <div className="bg-surface border border-line-strong rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wide">
          Export system logs
        </h3>
        <p className="text-xs text-fg-muted mt-0.5">
          Download a CSV of audit-log entries matching the filters below.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Action type"
          placeholder="All actions"
          options={actionTypes}
          value={filters.actionType || ''}
          onChange={set('actionType')}
        />
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

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-line">
        <p className="text-xs text-fg-muted">
          {rowCount == null
            ? 'CSV columns: when, action, by, user ID, details.'
            : `Last export: ${rowCount} row${rowCount === 1 ? '' : 's'}.`}
        </p>
        <Button onClick={exportNow} loading={busy}>
          <Download size={14} /> Download CSV
        </Button>
      </div>
    </div>
  );
}
