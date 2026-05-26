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
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#336021] hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-bold text-gray-400">
          {formatTicketNumber(ticket.ticket_number)} · {ticket.category}
        </span>
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <h3 className="font-bold text-[#336021] truncate">{ticket.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{ticket.description}</p>
      <p className="text-[11px] text-gray-400 mt-2">
        Raised {formatRelative(ticket.created_at)}
        {ticket.assignee_name && ` · Assigned to ${ticket.assignee_name}`}
      </p>
    </button>
  );
}
