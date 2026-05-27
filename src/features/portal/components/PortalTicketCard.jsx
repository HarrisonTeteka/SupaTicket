import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../tickets/components/StatusBadge';
import { PriorityBadge } from '../../tickets/components/PriorityBadge';
import { formatRelative, formatTicketNumber } from '../../tickets/tickets.utils';

/** Customer-facing summary card for one of their tickets. */
export function PortalTicketCard({ ticket }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
      className="w-full text-left bg-surface border border-line-strong rounded-2xl p-4 hover:border-brand-primary hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-bold text-fg-muted">
          {formatTicketNumber(ticket.ticket_number)} · {ticket.category}
        </span>
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <h3 className="font-semibold text-brand-primary truncate">{ticket.title}</h3>
      <p className="text-sm text-fg-secondary line-clamp-2 mt-0.5">{ticket.description}</p>
      <p className="text-[11px] text-fg-muted mt-2">
        Raised {formatRelative(ticket.created_at)}
        {ticket.assignee_name && ` · Assigned to ${ticket.assignee_name}`}
      </p>
    </button>
  );
}
