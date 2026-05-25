import { useAuth } from '../../auth/components/AuthGate';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { myOpenTickets, recentTickets } from '../selectors/dashboardSelectors';
import { DashboardStats } from '../components/DashboardStats';
import { StatusBreakdown } from '../components/StatusBreakdown';
import { PriorityBreakdown } from '../components/PriorityBreakdown';
import { MyTickets } from '../components/MyTickets';
import { RecentActivity } from '../components/RecentActivity';

/** Agent dashboard: live KPIs, backlog breakdowns and quick lists. */
export default function DashboardPage() {
  const { user } = useAuth();
  const { tickets, metrics, loading } = useDashboardMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardStats metrics={metrics} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusBreakdown byStatus={metrics.byStatus} />
        <PriorityBreakdown byPriority={metrics.byPriority} />
        <MyTickets tickets={myOpenTickets(tickets, user?.id)} />
        <RecentActivity tickets={recentTickets(tickets)} />
      </div>
    </div>
  );
}
