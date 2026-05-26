import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/components/AuthGate';
import { PageContainer } from './layout/PageContainer';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import TicketDetailPage from '../features/tickets/pages/TicketDetailPage';
import AdminPage from '../features/admin/pages/AdminPage';
import CustomersPage from '../features/customers/pages/CustomersPage';
import CustomerDetailPage from '../features/customers/pages/CustomerDetailPage';

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
      <Route
        path="/dashboard"
        element={
          <PageContainer title="Dashboard">
            <DashboardPage />
          </PageContainer>
        }
      />
      <Route
        path="/tickets"
        element={
          <PageContainer title="Tickets">
            <TicketsPage />
          </PageContainer>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <PageContainer title="Ticket">
            <TicketDetailPage />
          </PageContainer>
        }
      />
      <Route
        path="/customers"
        element={
          <PageContainer title="Customers">
            <CustomersPage />
          </PageContainer>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <PageContainer title="Customer">
            <CustomerDetailPage />
          </PageContainer>
        }
      />
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
