import { ShieldCheck } from 'lucide-react';
import { SLA_STATES, slaColor, slaLabel } from '../../tickets/tickets.utils';

/**
 * SLA breakdown for the live (non-terminal) backlog. Counts come from
 * `computeMetrics().bySla`, which uses `slaState()` and is keyed by
 * `resolution_due_at` (migration 0009). Tickets without an SLA window
 * (unknown) are intentionally excluded — this widget is for active SLA tracking.
 */
export function SlaBreakdown({ bySla }) {
  const counts = SLA_STATES.map((id) => ({ id, count: bySla?.[id] || 0 }));
  const total = counts.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...counts.map((r) => r.count));

  return (
    <div className="bg-surface border border-line-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-primary uppercase tracking-wide">
          <ShieldCheck size={15} /> SLA status
        </h3>
        <span className="text-[11px] text-fg-muted">
          {total} {total === 1 ? 'ticket' : 'tickets'} tracked
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-fg-muted">No active SLAs.</p>
      ) : (
        <div className="space-y-3">
          {counts.map(({ id, count }) => (
            <div key={id} className="flex items-center gap-3">
              <div className="w-24 shrink-0">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${slaColor(id)}`}>
                  {slaLabel(id)}
                </span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
