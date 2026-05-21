import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { useSystemLogs } from '../hooks/useSystemLogs';
import { listActionTypes } from '../services/systemLogsService';
import { SystemLogRow } from './SystemLogRow';
import { Select } from '../../../shared/components/Select';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';

/** Logs tab: paginated, filterable view of system_logs. */
export function SystemLogsView() {
  const { logs, count, loading, page, setPage, filters, setFilters, pageCount } =
    useSystemLogs();
  const [actionTypes, setActionTypes] = useState([]);

  useEffect(() => {
    listActionTypes()
      .then(setActionTypes)
      .catch(() => setActionTypes([]));
  }, []);

  const setFilter = (key) => (e) => {
    const next = { ...filters };
    if (e.target.value) next[key] = e.target.value;
    else delete next[key];
    setFilters(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Select
            label="Action type"
            placeholder="All actions"
            options={actionTypes}
            value={filters.actionType || ''}
            onChange={setFilter('actionType')}
          />
        </div>
        <div className="w-44">
          <Input
            label="Since"
            type="date"
            name="since"
            value={filters.since || ''}
            onChange={setFilter('since')}
          />
        </div>
        <div className="w-44">
          <Input
            label="Before"
            type="date"
            name="before"
            value={filters.before || ''}
            onChange={setFilter('before')}
          />
        </div>
      </div>

      {loading ? (
        <div className="h-40 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No log entries"
          description="No activity matches these filters."
        />
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">By</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <SystemLogRow key={l.id} log={l} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{count} total entries</p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs text-gray-500">
                Page {page + 1} of {pageCount}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
