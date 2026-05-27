import { useNavigate } from 'react-router-dom';
import { Building2, Paperclip } from 'lucide-react';
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
      className="w-full text-left bg-surface border border-line-strong rounded-2xl p-4 hover:border-brand-primary hover:shadow-md transition-all flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold text-fg-muted">
            {formatTicketNumber(ticket.ticket_number)}
          </span>
          <span className="text-xs text-fg-muted">·</span>
          <span className="text-xs text-fg-muted">{ticket.category}</span>
          {ticket.creator_role === 'customer' && (
            <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded">
              Customer
            </span>
          )}
          {(ticket.tags || []).slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] font-bold bg-brand-accent/10 text-brand-accent px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
          {(ticket.tags?.length ?? 0) > 3 && (
            <span className="text-[10px] text-fg-muted">
              +{ticket.tags.length - 3}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-brand-primary truncate">{ticket.title}</h3>
        <p className="text-sm text-fg-secondary truncate mt-0.5">{ticket.description}</p>
        {ticket.customer && (
          <p className="text-xs text-fg-secondary mt-1 flex items-center gap-1 truncate">
            <Building2 size={11} className="text-fg-muted shrink-0" />
            <span className="font-bold text-fg">{ticket.customer.name}</span>
            {ticket.customer.company && (
              <span className="text-fg-muted truncate">· {ticket.customer.company}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {attachmentCount > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-fg-muted">
            <Paperclip size={13} />
            {attachmentCount}
          </span>
        )}
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
        <div className="hidden md:block text-right w-28">
          <p className="text-xs font-bold text-brand-primary truncate">
            {ticket.assignee_name || 'Unassigned'}
          </p>
          <p className="text-[11px] text-fg-muted">{formatRelative(ticket.created_at)}</p>
        </div>
      </div>
    </button>
  );
}
