import { supabase } from '../../../lib/supabase';

/**
 * Bounded data fetches for the dashboard. KPIs are aggregated server-side
 * via the `get_dashboard_metrics` RPC (migration 0016); row lists for
 * MyTickets and RecentActivity are small and explicitly LIMITed.
 */

const ROW_COLUMNS =
  'id, ticket_number, title, status, priority, assigned_to, assignee_name, ' +
  'created_by, creator_name, created_at, resolved_at, resolution_due_at';

/** Aggregated KPIs + per-agent counts for the dashboard widgets. */
export async function getDashboardMetrics(userId) {
  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_user_id: userId ?? null,
  });
  if (error) throw error;
  return data ?? {};
}

/** Newest N tickets for the RecentActivity widget. */
export async function listRecentTickets(limit = 6) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ROW_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Open tickets assigned to the given user, newest first, capped. */
export async function listMyOpenTickets(userId, limit = 50) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('tickets')
    .select(ROW_COLUMNS)
    .eq('assigned_to', userId)
    .not('status', 'in', '("Resolved","Closed")')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
