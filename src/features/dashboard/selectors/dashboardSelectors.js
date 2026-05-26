/**
 * Pure aggregation + formatting helpers for the dashboard. No JSX, no network.
 * Terminal statuses (Resolved + Closed) count as completed work — they leave
 * the open backlog and contribute to resolution-time / completed-this-week.
 */
import { SLA_STATES, TERMINAL_STATUSES, slaState } from '../../tickets/tickets.utils';

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

/**
 * SLA breakdown for non-terminal tickets only. Terminal + unknown buckets
 * are dropped so the widget shows the live operational picture.
 */
export function countBySlaState(tickets) {
  const out = { 'on-track': 0, 'at-risk': 0, breached: 0 };
  for (const t of tickets) {
    const s = slaState(t);
    if (SLA_STATES.includes(s)) out[s]++;
  }
  return out;
}

/** Every dashboard KPI in one object. */
export function computeMetrics(tickets, userId) {
  const open = tickets.filter(isOpen);
  const terminal = tickets.filter((t) => TERMINAL_STATUSES.includes(t.status));
  const weekAgo = Date.now() - 7 * 86_400_000;

  const resolutionHours = terminal
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
    resolvedThisWeek: terminal.filter(
      (t) => t.resolved_at && new Date(t.resolved_at).getTime() >= weekAgo
    ).length,
    avgResolutionHours: average(resolutionHours),
    avgFirstResponseHours: average(responseHours),
    csatAverage: average(ratings),
    csatCount: ratings.length,
    byStatus: countByStatus(tickets),
    byPriority: countByPriority(tickets),
    bySla: countBySlaState(tickets),
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
