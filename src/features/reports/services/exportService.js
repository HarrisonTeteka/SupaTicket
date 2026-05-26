import { supabase } from '../../../lib/supabase';

/**
 * Network + CSV helpers backing the admin Reports tab. Lean column lists —
 * we don't pull descriptions or attachments, just enough for a useful CSV.
 */

const TICKET_EXPORT_COLUMNS =
  'id, ticket_number, title, status, priority, category, tags, ' +
  'assigned_to, assignee_name, created_by, creator_name, creator_role, ' +
  'created_at, updated_at, resolved_at, first_response_at, satisfaction_rating';

export async function fetchTicketsForExport(filters = {}) {
  let q = supabase
    .from('tickets')
    .select(TICKET_EXPORT_COLUMNS)
    .order('created_at', { ascending: false });

  if (filters.status) q = q.eq('status', filters.status);
  if (filters.priority) q = q.eq('priority', filters.priority);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.tag) q = q.contains('tags', [filters.tag]);
  if (filters.creator_role) q = q.eq('creator_role', filters.creator_role);
  if (filters.since) q = q.gte('created_at', filters.since);
  // Inclusive end-of-day for date inputs.
  if (filters.before) q = q.lte('created_at', `${filters.before}T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

const LOG_EXPORT_COLUMNS =
  'id, action_type, details, user_id, user_name, created_at';

export async function fetchLogsForExport(filters = {}) {
  let q = supabase
    .from('system_logs')
    .select(LOG_EXPORT_COLUMNS)
    .order('created_at', { ascending: false });

  if (filters.actionType) q = q.eq('action_type', filters.actionType);
  if (filters.since) q = q.gte('created_at', filters.since);
  if (filters.before) q = q.lte('created_at', `${filters.before}T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Convert an array of plain objects to a CSV string.
 * `columns` is an array of `{ key, label }`. Arrays render as
 * "a; b", objects as JSON, nulls/undefined as empty.
 */
export function toCsv(rows, columns) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v)
      ? v.join('; ')
      : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escape(row[c.key])).join(',')
  );
  return [header, ...lines].join('\r\n');
}

/** Trigger a browser download for a CSV string. */
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
