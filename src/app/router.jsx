import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/components/AuthGate';
import { PageContainer } from './layout/PageContainer';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import TicketDetailPage from '../features/tickets/pages/TicketDetailPage';
import AdminPage from '../features/admin/pages/AdminPage';

/**
 * Route table. Phases 2-5 wire the Dashboard, Tickets and Admin features.
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
      {isAdmin && (
        <Route
          path="/admin/*"
          element={
            <PageContainer title="System Settings">
              <AdminPage />
            </PageContainer>
          }
        />
      )}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
