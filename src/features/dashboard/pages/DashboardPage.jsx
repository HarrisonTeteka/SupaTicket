import { useAuth } from '../../auth/components/AuthGate';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { myOpenTickets, recentTickets } from '../selectors/dashboardSelectors';
import { DashboardStats } from '../components/DashboardStats';
import { StatusBreakdown } from '../components/StatusBreakdown';
import { PriorityBreakdown } from '../components/PriorityBreakdown';
import { SlaBreakdown } from '../components/SlaBreakdown';
import { MyTickets } from '../components/MyTickets';
import { RecentActivity } from '../components/RecentActivity';
import { AgentWorkload } from '../components/AgentWorkload';

/** Agent dashboard: live KPIs, backlog breakdowns and quick lists. */
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { tickets, metrics, loading } = useDashboardMetrics();

  const firstName = profile?.name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface border border-line-strong rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome hero with brand gradient — explicit inline gradient so it
          renders even if Tailwind hasn't generated the gradient utility yet. */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7 shadow-xl shadow-brand-primary/20"
        style={{
          background: 'linear-gradient(135deg, #336021 0%, #264918 60%, #1a3014 100%)',
        }}
      >
        <div className="relative z-10">
          <p
            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            SupaMoto · SupaTicket
          </p>
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-semibold"
            style={{ color: '#ffffff' }}
          >
            Welcome back, {firstName}.
          </h1>
          <p
            className="text-xs sm:text-sm mt-1.5 sm:mt-2"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Here's what's happening across the workspace today.
          </p>
        </div>
        <img
          src="/supamoto-logo-white.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-4 -bottom-6 h-24 sm:h-32 md:h-36 pointer-events-none select-none"
          style={{ opacity: 0.15 }}
        />
      </div>

      <DashboardStats metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusBreakdown byStatus={metrics.byStatus} />
        <PriorityBreakdown byPriority={metrics.byPriority} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SlaBreakdown bySla={metrics.bySla} />
        <AgentWorkload tickets={tickets} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyTickets tickets={myOpenTickets(tickets, user?.id)} />
        <RecentActivity tickets={recentTickets(tickets)} />
      </div>
    </div>
  );
}
