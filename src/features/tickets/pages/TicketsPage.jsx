import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useNewTicketModal } from '../hooks/useNewTicketModal';
import { listAllTags, listAssignees } from '../services/ticketsService';
import { TicketList } from '../components/TicketList';
import { TicketFilters } from '../components/TicketFilters';
import { Button } from '../../../shared/components/Button';

// Filter keys that round-trip through the URL. Anything not in this list
// (e.g. `parentId`, internal pagination) stays local.
const URL_FILTER_KEYS = ['status', 'priority', 'category', 'assigned_to', 'tag'];

/** Tickets queue: filter row + paginated list of top-level tickets. */
export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Seed initial filter state from the URL so dashboard widgets and other
  // pages can deep-link with `/tickets?status=...&priority=...`.
  const [filters, setFilters] = useState(() => {
    const seed = {};
    URL_FILTER_KEYS.forEach((k) => {
      const v = searchParams.get(k);
      if (v) seed[k] = v;
    });
    return seed;
  });
  const { openNewTicket } = useNewTicketModal();
  const [assignees, setAssignees] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // Keep the URL in sync when filters change, so the bar is shareable and
  // the back button restores the previous filter set.
  const updateFilters = (next) => {
    setFilters(next);
    const params = new URLSearchParams();
    URL_FILTER_KEYS.forEach((k) => {
      if (next[k]) params.set(k, next[k]);
    });
    setSearchParams(params, { replace: true });
  };

  // Only top-level tickets here — sub-tickets show under their parent.
  const queryFilters = useMemo(() => ({ ...filters, parentId: null }), [filters]);
  const {
    tickets, loading, error,
    page, setPage, pageSize, totalCount,
  } = useTickets(queryFilters);

  useEffect(() => {
    listAssignees()
      .then(setAssignees)
      .catch(() => setAssignees([]));
    listAllTags()
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col gap-4 pt-4 sm:pt-6 md:pt-8">
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-3 bg-app space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-fg-secondary">
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
          onChange={updateFilters}
          assignees={assignees}
          tags={allTags}
        />
      </div>

      <TicketList tickets={tickets} loading={loading} error={error} />

      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <p className="text-sm text-fg-secondary">{totalCount} total entries</p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-secondary">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded p-1 text-fg-muted hover:bg-surface-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded p-1 text-fg-muted hover:bg-surface-2 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
