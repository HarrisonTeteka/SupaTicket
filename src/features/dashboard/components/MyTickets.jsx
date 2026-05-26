import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { StatusBadge } from '../../tickets/components/StatusBadge';
import { PriorityBadge } from '../../tickets/components/PriorityBadge';
import { formatTicketNumber } from '../../tickets/tickets.utils';

/** Compact list of the current user's open assigned tickets. */
export function MyTickets({ tickets }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#336021] uppercase tracking-wide mb-4">
        <ListChecks size={15} /> My open tickets
      </h3>
      {tickets.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing assigned to you right now.</p>
      ) : (
        <div className="space-y-1.5">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/tickets/${t.id}`)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 text-left"
            >
              <span className="text-xs font-bold text-gray-400 shrink-0">
                {formatTicketNumber(t.ticket_number)}
              </span>
              <span className="flex-1 text-sm text-[#336021] font-medium truncate">
                {t.title}
              </span>
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
