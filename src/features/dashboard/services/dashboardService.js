import { supabase } from '../../../lib/supabase';

/**
 * Lean ticket query for dashboard metrics — only the columns the KPIs and
 * widgets need, so the dashboard doesn't pull full ticket bodies.
 */

const METRIC_COLUMNS =
  'id, ticket_number, title, status, priority, assigned_to, assignee_name, ' +
  'created_by, creator_name, created_at, resolved_at, first_response_at, ' +
  'satisfaction_rating, resolution_due_at';

export async function listTicketsForMetrics() {
  const { data, error } = await supabase
    .from('tickets')
    .select(METRIC_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
