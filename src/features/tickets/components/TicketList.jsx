import { Inbox } from 'lucide-react';
import { EmptyState } from '../../../shared/components/EmptyState';
import { TicketRow } from './TicketRow';

/** Renders the tickets list with loading skeleton, error and empty states. */
export function TicketList({ tickets = [], loading, error }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[88px] bg-surface border border-line-strong rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Inbox}
        title="Couldn't load tickets"
        description={error.message || 'Something went wrong. Try again.'}
      />
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tickets"
        description="No tickets match the current filters."
      />
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketRow key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
