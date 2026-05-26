import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { StatusBadge } from '../../tickets/components/StatusBadge';
import { formatRelative, formatTicketNumber } from '../../tickets/tickets.utils';

/** Feed of the most recently raised tickets. */
export function RecentActivity({ tickets }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#336021] uppercase tracking-wide mb-4">
        <Activity size={15} /> Recent tickets
      </h3>
      {tickets.length === 0 ? (
        <p className="text-sm text-gray-400">No tickets yet.</p>
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
              <StatusBadge status={t.status} />
              <span className="text-[11px] text-gray-400 shrink-0 w-14 text-right">
                {formatRelative(t.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
