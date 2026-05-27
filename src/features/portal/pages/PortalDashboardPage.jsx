import { Link } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';
import { usePortalTickets } from '../hooks/usePortalTickets';
import { PortalTicketCard } from '../components/PortalTicketCard';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/Button';

/** Customer landing page: a list of their own tickets, newest first. */
export default function PortalDashboardPage() {
  const { tickets, loading, error } = usePortalTickets();

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface border border-line-strong rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Inbox}
        title="Couldn't load your tickets"
        description={error.message || 'Try refreshing.'}
      />
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tickets yet"
        description="Raise your first support ticket to get started."
        action={
          <Link to="/portal/new">
            <Button>
              <Plus size={15} /> Raise ticket
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">My Tickets</h1>
        <p className="text-sm text-fg-secondary">
          {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="space-y-3">
        {tickets.map((t) => (
          <PortalTicketCard key={t.id} ticket={t} />
        ))}
      </div>
    </div>
  );
}
