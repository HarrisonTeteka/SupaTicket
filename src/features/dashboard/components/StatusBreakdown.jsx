import { StatusBadge } from '../../tickets/components/StatusBadge';
import { TICKET_STATUSES } from '../../tickets/tickets.utils';

/** Tickets-by-status as proportional CSS bars. */
export function StatusBreakdown({ byStatus }) {
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const max = Math.max(1, ...Object.values(byStatus));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="text-sm font-black text-[#336021] uppercase tracking-wide mb-4">
        By status
      </h3>
      {total === 0 ? (
        <p className="text-sm text-gray-400">No tickets yet.</p>
      ) : (
        <div className="space-y-3">
          {TICKET_STATUSES.map((s) => {
            const count = byStatus[s] || 0;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <StatusBadge status={s} />
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#336021] rounded-full"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-[#336021]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
