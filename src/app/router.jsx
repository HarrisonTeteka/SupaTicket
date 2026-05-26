import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/components/AuthGate';
import { PageContainer } from './layout/PageContainer';

// Lazy-loaded route components. Each one becomes its own chunk, so the
// initial bundle only pulls in what the first route needs (Dashboard).
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const TicketsPage = lazy(() => import('../features/tickets/pages/TicketsPage'));
const TicketDetailPage = lazy(() => import('../features/tickets/pages/TicketDetailPage'));
const AdminPage = lazy(() => import('../features/admin/pages/AdminPage'));

/**
 * Route table. Each routed page is code-split via React.lazy so the initial
 * bundle stays small; the Topbar/PageContainer chrome stays put while a new
 * chunk streams in.
 */
export function AppRouter() {
  const { isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<LazyRoute title="Dashboard"><DashboardPage /></LazyRoute>} />
      <Route path="/tickets" element={<LazyRoute title="Tickets"><TicketsPage /></LazyRoute>} />
      <Route path="/tickets/:id" element={<LazyRoute title="Ticket"><TicketDetailPage /></LazyRoute>} />
      {isAdmin && (
        <Route
          path="/admin/*"
          element={<LazyRoute title="System Settings"><AdminPage /></LazyRoute>}
        />
      )}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function LazyRoute({ title, children }) {
  return (
    <PageContainer title={title}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </PageContainer>
  );
}

function PageLoader() {
  return (
    <div className="space-y-3">
      <div className="h-24 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      <div className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      <div className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />
    </div>
  );
}
