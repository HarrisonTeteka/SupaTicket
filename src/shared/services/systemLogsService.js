import { supabase } from '../../lib/supabase';

/**
 * Record an audit-log entry via the `log_action` SECURITY DEFINER rpc.
 *
 * Never throws — audit logging must not break a user flow. Callers can
 * fire-and-forget. (Until migration 0006 is applied the rpc is missing and
 * this is a silent no-op.)
 *
 * @param {string} actionType
 * @param {string|null} [details]
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
