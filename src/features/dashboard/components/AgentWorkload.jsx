import { useEffect, useState } from 'react';
import { Users, UserX } from 'lucide-react';
import { listAssignees } from '../../tickets/services/ticketsService';

/**
 * Active workload per agent — open tickets assigned to each staff/admin.
 *
 * Counts come pre-aggregated from `get_dashboard_metrics` (migration 0016)
 * as `byAgent: [{ id, count }, ...]`. The agent roster (name/email) is
 * fetched once on mount; it changes far less often than ticket counts.
 */
export function AgentWorkload({ byAgent = [], unassigned = 0, totalOpen = 0 }) {
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

  const countById = new Map((byAgent || []).map((r) => [r.id, r.count]));

  const rows = agents
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      count: countById.get(a.id) || 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const max = Math.max(1, unassigned, ...rows.map((r) => r.count));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#336021] uppercase tracking-wide">
          <Users size={15} /> Active workload
        </h3>
        <span className="text-[11px] text-gray-400">
          {totalOpen} open · {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-gray-400">No agents yet.</p>
      ) : (
        <div className="space-y-2.5">
          {unassigned > 0 && (
            <WorkloadRow
              avatar={<UserX size={13} />}
              avatarClass="bg-gray-100 text-gray-500"
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
              avatarClass="bg-[#F58202] text-white"
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

function WorkloadRow({ avatar, avatarClass, name, count, max, barClass = 'bg-[#336021]', muted }) {
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
            muted ? 'text-gray-500' : 'text-[#336021]'
          }`}
        >
          {name}
        </span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${(count / max) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-6 text-right text-sm font-bold text-[#336021]">{count}</span>
    </div>
  );
}
