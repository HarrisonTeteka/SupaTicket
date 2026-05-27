import { useEffect, useState } from 'react';
import { Users, UserX } from 'lucide-react';
import { listAssignees } from '../../tickets/services/ticketsService';

const TERMINAL_STATUSES = ['Resolved', 'Closed'];
const isOpen = (t) => !TERMINAL_STATUSES.includes(t.status);

/**
 * Active workload per agent — open tickets assigned to each staff/admin.
 *
 * Live: the `tickets` prop comes from useDashboardMetrics which subscribes to
 * the `tickets` table via realtime, so every assignment / status change
 * re-derives this widget within a frame. The agent roster itself is fetched
 * once on mount (it changes much less often than ticket counts).
 */
export function AgentWorkload({ tickets }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAssignees()
      .then((data) => {
        if (!cancelled) {
          setAgents(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Roll up open tickets per agent + an "Unassigned" bucket.
  const openByAgent = new Map();
  let unassigned = 0;
  let totalOpen = 0;
  for (const t of tickets) {
    if (!isOpen(t)) continue;
    totalOpen++;
    if (!t.assigned_to) {
      unassigned++;
      continue;
    }
    openByAgent.set(t.assigned_to, (openByAgent.get(t.assigned_to) || 0) + 1);
  }

  const rows = agents
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      count: openByAgent.get(a.id) || 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const max = Math.max(1, unassigned, ...rows.map((r) => r.count));

  return (
    <div className="bg-surface border border-line-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-primary uppercase tracking-wide">
          <Users size={15} /> Active workload
        </h3>
        <span className="text-[11px] text-fg-muted">
          {totalOpen} open · {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-fg-muted">Loading...</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-fg-muted">No agents yet.</p>
      ) : (
        <div className="space-y-2.5">
          {unassigned > 0 && (
            <WorkloadRow
              avatar={<UserX size={13} />}
              avatarClass="bg-surface-2 text-fg-secondary"
              name="Unassigned"
              count={unassigned}
              max={max}
              barClass="bg-amber-400"
              muted
            />
          )}
          {rows.map((a) => (
            <WorkloadRow
              key={a.id}
              avatar={(a.name || '?').charAt(0).toUpperCase()}
              avatarClass="bg-brand-accent text-white"
              name={a.name}
              count={a.count}
              max={max}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkloadRow({ avatar, avatarClass, name, count, max, barClass = 'bg-brand-primary', muted }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${avatarClass}`}
      >
        {avatar}
      </div>
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <span
          className={`text-xs font-semibold truncate w-24 sm:w-28 shrink-0 ${
            muted ? 'text-fg-secondary' : 'text-brand-primary'
          }`}
        >
          {name}
        </span>
        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${(count / max) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-6 text-right text-sm font-bold text-brand-primary">{count}</span>
    </div>
  );
}
