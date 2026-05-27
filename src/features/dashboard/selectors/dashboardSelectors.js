/**
 * Pure formatting helpers used by dashboard widgets. KPI aggregation now
 * lives in `get_dashboard_metrics` (migration 0016); see useDashboardMetrics.
 */

/** Hours -> "<1h" / "6h" / "2.5d"; null -> "—". */
export function formatDuration(hours) {
  if (hours == null) return '—';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
