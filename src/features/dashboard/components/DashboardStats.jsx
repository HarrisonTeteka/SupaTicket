import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Star,
  UserCheck,
  Zap,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { StatCard } from '../../../shared/components/StatCard';
import { formatDuration } from '../selectors/dashboardSelectors';

/** Grid of KPI stat cards across the top of the dashboard. Each card is a
 *  link into the tickets queue with the most specific filter the metric
 *  supports; metrics that map to multiple statuses (Open, Unassigned) or
 *  aggregates that have no filter (Avg first response, CSAT) link to the
 *  full list. Extending listTickets with `openOnly` / `unassigned` filters
 *  later would let those links become precise. */
export function DashboardStats({ metrics }) {
  const { profile } = useAuth();
  const csat =
    metrics.csatAverage != null ? `${metrics.csatAverage.toFixed(1)} / 5` : '—';
  const myOpenHref = profile?.id
    ? `/tickets?assigned_to=${encodeURIComponent(profile.id)}`
    : '/tickets';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatLink to="/tickets">
        <StatCard icon={Inbox} tone="moss" label="Open tickets" value={metrics.open} />
      </StatLink>
      <StatLink to={myOpenHref}>
        <StatCard icon={UserCheck} tone="tangerine" label="My open" value={metrics.myOpen} />
      </StatLink>
      <StatLink to="/tickets">
        <StatCard
          icon={AlertCircle}
          tone="amber"
          label="Unassigned"
          value={metrics.unassigned}
        />
      </StatLink>
      <StatLink to="/tickets?status=Resolved">
        <StatCard
          icon={CheckCircle2}
          tone="green"
          label="Resolved this week"
          value={metrics.resolvedThisWeek}
        />
      </StatLink>
      <StatLink to="/tickets?status=Resolved">
        <StatCard
          icon={Clock}
          tone="gray"
          label="Avg resolution"
          value={formatDuration(metrics.avgResolutionHours)}
        />
      </StatLink>
      <StatLink to="/tickets">
        <StatCard
          icon={Zap}
          tone="gray"
          label="Avg first response"
          value={formatDuration(metrics.avgFirstResponseHours)}
        />
      </StatLink>
      <StatLink to="/tickets?status=Resolved">
        <StatCard
          icon={Star}
          tone="cream"
          label="CSAT"
          value={csat}
          hint={metrics.csatCount > 0 ? `${metrics.csatCount} rated` : 'No ratings yet'}
        />
      </StatLink>
      <StatLink to="/tickets">
        <StatCard icon={Layers} tone="gray" label="Total tickets" value={metrics.total} />
      </StatLink>
    </div>
  );
}

function StatLink({ to, children }) {
  return (
    <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-brand-accent rounded-2xl">
      {children}
    </Link>
  );
}
