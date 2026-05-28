/**
 * Pure helpers for the tickets feature: enum lists, badge colour maps and
 * display formatters. No JSX, no network access.
 */

export const TICKET_STATUSES = [
  'Open',
  'Pending',
  'In Progress',
  'Overdue',
  'Escalated',
  'Resolved',
  'Closed',
];
export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

/** Statuses that count as "done" — used for resolved_at and completed KPIs. */
export const TERMINAL_STATUSES = ['Resolved', 'Closed'];

/** Max attachment size enforced client-side (PHASES.md: 10 MB). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const STATUS_STYLES = {
  Open: 'bg-blue-100 text-blue-700',
  Pending: 'bg-brand-pending text-brand-danger',
  'In Progress': 'bg-amber-100 text-amber-700',
  Overdue: 'bg-orange-100 text-orange-700',
  Escalated: 'bg-red-100 text-red-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-surface-2 text-fg-secondary',
};

const PRIORITY_STYLES = {
  Low: 'bg-surface-2 text-fg',
  Medium: 'bg-sky-100 text-sky-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

export function statusColor(status) {
  return STATUS_STYLES[status] || 'bg-surface-2 text-fg';
}

export function priorityColor(priority) {
  return PRIORITY_STYLES[priority] || 'bg-surface-2 text-fg';
}

/** 100123 -> "#100123" */
export function formatTicketNumber(n) {
  return n == null ? '' : `#${n}`;
}

/** Bytes -> "1.4 MB" */
export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** ISO timestamp -> "20 May 2026, 14:30" */
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO timestamp -> "2h ago", "3d ago", or a date for older items. */
export function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDateTime(iso).split(',')[0];
}

/** Does this query string look like a ticket number rather than a keyword? */
export function looksLikeTicketNumber(query) {
  return /^\d{4,}$/.test(String(query).trim());
}

// ---------------------------------------------------------------------------
// SLA helpers (Phase 7 — depends on migrations 0009/0010 having been run).
// ---------------------------------------------------------------------------

/** SLA states a non-terminal ticket can be in. */
export const SLA_STATES = ['on-track', 'at-risk', 'breached'];

/** Fraction of the SLA window elapsed before a ticket is flagged "at risk". */
const AT_RISK_RATIO = 0.8;

/**
 * Derive the SLA state of a ticket from its lifecycle timestamps + status.
 *
 *   - 'done'      — ticket is in a terminal state; SLA no longer ticking.
 *   - 'unknown'   — ticket has no resolution_due_at (migration 0009 not yet
 *                   applied, or row created before the trigger existed).
 *   - 'breached'  — now >= resolution_due_at.
 *   - 'at-risk'   — within the last 20% of the SLA window.
 *   - 'on-track'  — otherwise.
 */
export function slaState(ticket) {
  if (!ticket || TERMINAL_STATUSES.includes(ticket.status)) return 'done';
  if (!ticket.resolution_due_at) return 'unknown';

  const due = new Date(ticket.resolution_due_at).getTime();
  const now = Date.now();
  if (now >= due) return 'breached';

  const created = new Date(ticket.created_at).getTime();
  const span = due - created;
  if (!Number.isFinite(span) || span <= 0) return 'on-track';

  const elapsed = now - created;
  if (elapsed / span >= AT_RISK_RATIO) return 'at-risk';
  return 'on-track';
}

const SLA_STYLES = {
  'on-track': 'bg-emerald-100 text-emerald-700',
  'at-risk': 'bg-amber-100 text-amber-700',
  breached: 'bg-brand-danger/15 text-brand-danger',
  done: 'bg-surface-2 text-fg-secondary',
  unknown: 'bg-surface-2 text-fg-muted',
};

const SLA_LABELS = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  breached: 'Breached',
  done: 'Done',
  unknown: 'No SLA',
};

export function slaColor(state) {
  return SLA_STYLES[state] || SLA_STYLES.unknown;
}

export function slaLabel(state) {
  return SLA_LABELS[state] || SLA_LABELS.unknown;
}
