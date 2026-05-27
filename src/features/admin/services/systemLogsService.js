import { supabase } from '../../../lib/supabase';

export { logAction } from '../../../shared/services/systemLogsService';

/**
 * Paginated log reader and action-type helpers for the admin Logs tab.
 * logAction lives in shared/services/systemLogsService — re-exported above
 * so any admin code that imports from here still works.
 */

const COLUMNS = 'id, action_type, details, user_id, user_name, created_at';

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
  const { data, error } = await supabase.rpc('get_log_action_types');
  if (error) throw error;
  return data ?? [];
}
