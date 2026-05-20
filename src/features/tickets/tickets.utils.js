/**
 * Pure helpers for the tickets feature: enum lists, badge colour maps and
 * display formatters. No JSX, no network access.
 */

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved'];
export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

/** Max attachment size enforced client-side (PHASES.md: 10 MB). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const STATUS_STYLES = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
};

const PRIORITY_STYLES = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-sky-100 text-sky-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

export function statusColor(status) {
  return STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
}

export function priorityColor(priority) {
  return PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-600';
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
