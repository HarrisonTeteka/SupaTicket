/**
 * Pure aggregation + formatting helpers for the dashboard. No JSX, no network.
 * In Phase 5 the only terminal status is 'Resolved' (Phase 6 adds 'Closed').
 */

const TERMINAL_STATUSES = ['Resolved'];

const isOpen = (t) => !TERMINAL_STATUSES.includes(t.status);

function average(nums) {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function hoursBetween(from, to) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
}

export function countByStatus(tickets) {
  const out = {};
  for (const t of tickets) out[t.status] = (out[t.status] || 0) + 1;
  return out;
}

export function countByPriority(tickets) {
  const out = {};
  for (const t of tickets) out[t.priority] = (out[t.priority] || 0) + 1;
  return out;
}

/** Every dashboard KPI in one object. */
export function computeMetrics(tickets, userId) {
  const open = tickets.filter(isOpen);
  const resolved = tickets.filter((t) => t.status === 'Resolved');
  const weekAgo = Date.now() - 7 * 86_400_000;

  const resolutionHours = resolved
    .filter((t) => t.resolved_at)
    .map((t) => hoursBetween(t.created_at, t.resolved_at));
  const responseHours = tickets
    .filter((t) => t.first_response_at)
    .map((t) => hoursBetween(t.created_at, t.first_response_at));
  const ratings = tickets
    .map((t) => t.satisfaction_rating)
    .filter((r) => r != null);

  return {
    total: tickets.length,
    open: open.length,
    myOpen: open.filter((t) => t.assigned_to === userId).length,
    unassigned: open.filter((t) => !t.assigned_to).length,
    resolvedThisWeek: resolved.filter(
      (t) => t.resolved_at && new Date(t.resolved_at).getTime() >= weekAgo
    ).length,
    avgResolutionHours: average(resolutionHours),
    avgFirstResponseHours: average(responseHours),
    csatAverage: average(ratings),
    csatCount: ratings.length,
    byStatus: countByStatus(tickets),
    byPriority: countByPriority(tickets),
  };
}

/** Newest tickets first, capped at `limit`. */
export function recentTickets(tickets, limit = 6) {
  return [...tickets]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

/** A user's open assigned tickets, newest first. */
export function myOpenTickets(tickets, userId) {
  return tickets
    .filter((t) => t.assigned_to === userId && isOpen(t))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/** Hours -> "<1h" / "6h" / "2.5d"; null -> "—". */
export function formatDuration(hours) {
  if (hours == null) return '—';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
