import { useEffect, useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useNewTicketModal } from '../hooks/useNewTicketModal';
import { listAllTags, listAssignees } from '../services/ticketsService';
import { TicketList } from '../components/TicketList';
import { TicketFilters } from '../components/TicketFilters';
import { Button } from '../../../shared/components/Button';

/** Tickets queue: filter row + paginated list of top-level tickets. */
export default function TicketsPage() {
  const [filters, setFilters] = useState({});
  const { openNewTicket } = useNewTicketModal();
  const [assignees, setAssignees] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // Only top-level tickets here — sub-tickets show under their parent.
  const queryFilters = useMemo(() => ({ ...filters, parentId: null }), [filters]);
  const {
    tickets, loading, error,
    page, setPage, pageSize, setPageSize, totalCount,
  } = useTickets(queryFilters);

  useEffect(() => {
    listAssignees()
      .then(setAssignees)
      .catch(() => setAssignees([]));
    listAllTags()
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const rangeStart = totalCount === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min((page + 1) * pageSize, totalCount);

  // Up to 5 page buttons centred around the current page.
  const pageWindow = (() => {
    const half = 2;
    let start = Math.max(0, page - half);
    let end = Math.min(totalPages - 1, start + 4);
    start = Math.max(0, end - 4);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {loading
            ? 'Loading tickets...'
            : `${totalCount} ticket${totalCount === 1 ? '' : 's'}`}
        </p>
        <Button onClick={() => openNewTicket()}>
          <Plus size={15} /> Raise ticket
        </Button>
      </div>

      <TicketFilters
        filters={filters}
        onChange={setFilters}
        assignees={assignees}
        tags={allTags}
      />
      <TicketList tickets={tickets} loading={loading} error={error} />

      {!loading && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Showing {rangeStart}–{rangeEnd} of {totalCount} tickets
          </p>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Rows per page</label>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {[25, 50, 100].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            {pageWindow.map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[2rem] rounded px-2 py-1 text-sm ${
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p + 1}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
