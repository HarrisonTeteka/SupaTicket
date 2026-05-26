import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, useAuth } from '../features/auth/components/AuthGate';
import { Sidebar } from './layout/Sidebar';
import { AppRouter } from './router';
import { NewTicketModalProvider } from '../features/tickets/hooks/useNewTicketModal';
import { NewTicketModal } from '../features/tickets/components/NewTicketModal';
import { PortalLayout } from '../features/portal/components/PortalLayout';
import PortalDashboardPage from '../features/portal/pages/PortalDashboardPage';
import PortalNewTicketPage from '../features/portal/pages/PortalNewTicketPage';
import PortalTicketDetailPage from '../features/portal/pages/PortalTicketDetailPage';

/**
 * App entry point composed of these layers:
 *
 *   <Providers> (in main.jsx)  →  <AuthGate>  →  <RoleAwareShell>
 *     ├─ <PortalShell>   (customer)
 *     └─ <StaffShell>    (staff / admin)
 *
 * AuthGate handles unauthenticated state by rendering the login screen.
 * RoleAwareShell picks the right chrome + router based on the signed-in
 * user's role. The two routers don't overlap — a staff member hitting
 * /portal lands in AppRouter's catch-all (→ /dashboard), and a customer
 * hitting /tickets lands in PortalShell's catch-all (→ /portal).
 */
export default function AppShell() {
  return (
    <AuthGate>
      <RoleAwareShell />
    </AuthGate>
  );
}

function RoleAwareShell() {
  const { isCustomer } = useAuth();
  return isCustomer ? <PortalShell /> : <StaffShell />;
}

function StaffShell() {
  return (
    <NewTicketModalProvider>
      <div className="flex h-screen bg-[#f5f7f9] text-[#12344d] overflow-hidden">
        <Sidebar />
        <AppRouter />
      </div>
      <NewTicketModal />
    </NewTicketModalProvider>
  );
}

function PortalShell() {
  return (
    <PortalLayout>
      <Routes>
        <Route path="/portal" element={<PortalDashboardPage />} />
        <Route path="/portal/new" element={<PortalNewTicketPage />} />
        <Route path="/portal/tickets/:id" element={<PortalTicketDetailPage />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  );
}
