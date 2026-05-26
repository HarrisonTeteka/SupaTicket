import { PriorityBadge } from '../../tickets/components/PriorityBadge';
import { TICKET_PRIORITIES } from '../../tickets/tickets.utils';

/** Tickets-by-priority as proportional CSS bars. */
export function PriorityBreakdown({ byPriority }) {
  const total = Object.values(byPriority).reduce((s, n) => s + n, 0);
  const max = Math.max(1, ...Object.values(byPriority));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-[#336021] uppercase tracking-wide mb-4">
        By priority
      </h3>
      {total === 0 ? (
        <p className="text-sm text-gray-400">No tickets yet.</p>
      ) : (
        <div className="space-y-3">
          {TICKET_PRIORITIES.map((p) => {
            const count = byPriority[p] || 0;
            return (
              <div key={p} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <PriorityBadge priority={p} />
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
