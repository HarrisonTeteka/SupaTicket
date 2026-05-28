import { Link } from 'react-router-dom';
import { StatusBadge } from '../../tickets/components/StatusBadge';
import { TICKET_STATUSES } from '../../tickets/tickets.utils';

/** Tickets-by-status as proportional CSS bars. Each row links to the filtered
 *  tickets queue (matches the `status` URL param TicketsPage reads). */
export function StatusBreakdown({ byStatus }) {
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const max = Math.max(1, ...Object.values(byStatus));

  return (
    <div className="bg-surface border border-line-strong rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wide mb-4">
        By status
      </h3>
      {total === 0 ? (
        <p className="text-sm text-fg-muted">No tickets yet.</p>
      ) : (
        <div className="space-y-1.5">
          {TICKET_STATUSES.map((s) => {
            const count = byStatus[s] || 0;
            return (
              <Link
                key={s}
                to={`/tickets?status=${encodeURIComponent(s)}`}
                className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-surface-2 transition-colors"
              >
                <div className="w-24 shrink-0">
                  <StatusBadge status={s} />
                </div>
                <div className="flex-1 h-2.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-brand-primary">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
