import { supabase } from '../../../lib/supabase';

/**
 * System audit log: the `logAction` writer (used app-wide) and the paginated
 * reader for the admin Logs tab.
 */

const COLUMNS = 'id, action_type, details, user_id, user_name, created_at';

/**
 * Record an audit-log entry via the `log_action` SECURITY DEFINER rpc.
 *
 * Never throws — audit logging must not break a user flow. Callers can
 * fire-and-forget. (Until migration 0006 is applied the rpc is missing and
 * this is a silent no-op.)
 */
export async function logAction(actionType, details) {
  try {
    await supabase.rpc('log_action', {
      action_type: actionType,
      details: details ?? null,
    });
  } catch {
    /* swallowed by design */
  }
}

/**
 * Paginated log reader. `filters`: { actionType, since, before }.
 * Returns { logs, count } where count is the total matching rows.
 */
export async function listLogs({
  actionType,
  since,
  before,
  limit = 25,
  offset = 0,
} = {}) {
  let query = supabase
    .from('system_logs')
    .select(COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (actionType) query = query.eq('action_type', actionType);
  if (since) query = query.gte('created_at', since);
  if (before) query = query.lte('created_at', before);

  const { data, error, count } = await query;
  if (error) throw error;
  return { logs: data ?? [], count: count ?? 0 };
}

/** Distinct action types present in the log, for the filter dropdown. */
export async function listActionTypes() {
  const { data, error } = await supabase
    .from('system_logs')
    .select('action_type')
    .order('action_type');
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.action_type))];
}
