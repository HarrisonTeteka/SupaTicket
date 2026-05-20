import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/components/AuthGate';
import { PageContainer } from './layout/PageContainer';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import TicketDetailPage from '../features/tickets/pages/TicketDetailPage';

/**
 * Route table. Real feature pages drop in here as we build each phase.
 * Phase 2 wires the Tickets feature; Dashboard and Admin remain placeholders.
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
              <AdminPlaceholder />
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
        Phase 1 + 2 are live: auth, shell and the Tickets feature. Dashboard
        widgets land in a later phase.
      </p>
    </div>
  );
}

function AdminPlaceholder() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <h2 className="text-lg font-bold mb-2">System Settings</h2>
      <p className="text-sm text-gray-500">
        Coming in Phase 4: staff directory, categories, departments, custom
        fields, logs.
      </p>
    </div>
  );
}
