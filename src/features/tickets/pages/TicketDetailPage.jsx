import { useParams } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { useTicket } from '../hooks/useTicket';
import { TicketDetail } from '../components/TicketDetail';
import { EmptyState } from '../../../shared/components/EmptyState';

/** Route component for /tickets/:id — loads the ticket and renders its detail. */
export default function TicketDetailPage() {
  const { id } = useParams();
  const { ticket, loading, error, setTicket } = useTicket(id);

  if (loading) {
    return <div className="h-64 bg-surface border border-line-strong rounded-2xl animate-pulse" />;
  }

  if (error || !ticket) {
    return (
      <EmptyState
        icon={Ticket}
        title="Ticket not found"
        description="This ticket doesn't exist, or you don't have access to it."
      />
    );
  }

  return <TicketDetail ticket={ticket} onLocalChange={setTicket} />;
}
