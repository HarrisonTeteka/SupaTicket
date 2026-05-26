import { GitBranch, Plus } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useNewTicketModal } from '../hooks/useNewTicketModal';
import { TicketRow } from './TicketRow';
import { Button } from '../../../shared/components/Button';

/** Lists the sub-tickets of a parent ticket, with an "Add" shortcut. */
export function SubTicketList({ parentId }) {
  const { tickets, loading } = useTickets({ parentId });
  const { openNewTicket } = useNewTicketModal();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#336021] uppercase tracking-wide">
          <GitBranch size={15} /> Sub-tickets
          {tickets.length > 0 && ` (${tickets.length})`}
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openNewTicket({ parent_id: parentId })}
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-400">No sub-tickets.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
