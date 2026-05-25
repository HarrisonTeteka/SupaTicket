import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Star,
  UserCheck,
  Zap,
} from 'lucide-react';
import { StatCard } from '../../../shared/components/StatCard';
import { formatDuration } from '../selectors/dashboardSelectors';

/** Grid of KPI stat cards across the top of the dashboard. */
export function DashboardStats({ metrics }) {
  const csat =
    metrics.csatAverage != null ? `${metrics.csatAverage.toFixed(1)} / 5` : '—';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Inbox} tone="navy" label="Open tickets" value={metrics.open} />
      <StatCard icon={UserCheck} tone="indigo" label="My open" value={metrics.myOpen} />
      <StatCard
        icon={AlertCircle}
        tone="amber"
        label="Unassigned"
        value={metrics.unassigned}
      />
      <StatCard
        icon={CheckCircle2}
        tone="emerald"
        label="Resolved this week"
        value={metrics.resolvedThisWeek}
      />
      <StatCard
        icon={Clock}
        tone="gray"
        label="Avg resolution"
        value={formatDuration(metrics.avgResolutionHours)}
      />
      <StatCard
        icon={Zap}
        tone="gray"
        label="Avg first response"
        value={formatDuration(metrics.avgFirstResponseHours)}
      />
      <StatCard
        icon={Star}
        tone="amber"
        label="CSAT"
        value={csat}
        hint={metrics.csatCount > 0 ? `${metrics.csatCount} rated` : 'No ratings yet'}
      />
      <StatCard icon={Inbox} tone="gray" label="Total tickets" value={metrics.total} />
    </div>
  );
}
