import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useNewTicketModal } from '../hooks/useNewTicketModal';
import { listAllTags, listAssignees } from '../services/ticketsService';
import { TicketList } from '../components/TicketList';
import { TicketFilters } from '../components/TicketFilters';
import { Button } from '../../../shared/components/Button';

/** Tickets queue: filter row + paginated-ready list of top-level tickets. */
export default function TicketsPage() {
  const [filters, setFilters] = useState({});
  const { openNewTicket } = useNewTicketModal();
  const [assignees, setAssignees] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // Only top-level tickets here — sub-tickets show under their parent.
  const queryFilters = useMemo(() => ({ ...filters, parentId: null }), [filters]);
  const { tickets, loading, error } = useTickets(queryFilters);

  useEffect(() => {
    listAssignees()
      .then(setAssignees)
      .catch(() => setAssignees([]));
    listAllTags()
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {loading
            ? 'Loading tickets...'
            : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
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
    </div>
  );
}
