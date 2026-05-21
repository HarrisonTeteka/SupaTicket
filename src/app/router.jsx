import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/components/AuthGate';
import { PageContainer } from './layout/PageContainer';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import TicketDetailPage from '../features/tickets/pages/TicketDetailPage';
import AdminPage from '../features/admin/pages/AdminPage';

/**
 * Route table. Phases 2-4 wire the Tickets and Admin features; Dashboard
 * remains a placeholder pending a separate scoping pass.
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
            <DashboardPlaceholder />
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

function DashboardPlaceholder() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <h2 className="text-lg font-bold mb-2">Welcome to SupaTicket</h2>
      <p className="text-sm text-gray-500">
        Phases 1-4 are live: auth, tickets, notifications and admin settings.
        Dashboard widgets land in a later pass.
      </p>
    </div>
  );
}
