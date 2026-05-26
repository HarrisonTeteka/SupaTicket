import { useNavigate } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatRelative, formatTicketNumber } from '../tickets.utils';

/** One ticket in the list view. Clicking navigates to the detail page. */
export function TicketRow({ ticket }) {
  const navigate = useNavigate();
  const attachmentCount = ticket.attachments?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#336021] hover:shadow-md transition-all flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold text-gray-400">
            {formatTicketNumber(ticket.ticket_number)}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{ticket.category}</span>
          {ticket.creator_role === 'customer' && (
            <span className="text-[10px] font-bold bg-[#336021]/10 text-[#336021] px-1.5 py-0.5 rounded">
              Customer
            </span>
          )}
          {(ticket.tags || []).slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] font-bold bg-[#F58202]/10 text-[#F58202] px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
          {(ticket.tags?.length ?? 0) > 3 && (
            <span className="text-[10px] text-gray-400">
              +{ticket.tags.length - 3}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-[#336021] truncate">{ticket.title}</h3>
        <p className="text-sm text-gray-500 truncate mt-0.5">{ticket.description}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {attachmentCount > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <Paperclip size={13} />
            {attachmentCount}
          </span>
        )}
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
        <div className="hidden md:block text-right w-28">
          <p className="text-xs font-bold text-[#336021] truncate">
            {ticket.assignee_name || 'Unassigned'}
          </p>
          <p className="text-[11px] text-gray-400">{formatRelative(ticket.created_at)}</p>
        </div>
      </div>
    </button>
  );
}
