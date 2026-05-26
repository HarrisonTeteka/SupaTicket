import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, useAuth } from '../features/auth/components/AuthGate';
import { Sidebar } from './layout/Sidebar';
import { AppRouter } from './router';
import { MobileNavProvider, useMobileNav } from './layout/useMobileNav';
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
 * user's role.
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
    <MobileNavProvider>
      <NewTicketModalProvider>
        <div className="flex h-screen bg-[#f5f7f9] text-[#336021] overflow-hidden">
          <Sidebar />
          <MobileNavBackdrop />
          <AppRouter />
        </div>
        <NewTicketModal />
      </NewTicketModalProvider>
    </MobileNavProvider>
  );
}

/** Dark overlay shown behind the slid-in sidebar on mobile. */
function MobileNavBackdrop() {
  const { isOpen, close } = useMobileNav();
  if (!isOpen) return null;
  return (
    <button
      type="button"
      aria-label="Close navigation"
      onClick={close}
      className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
    />
  );
}

function PortalShell() {
  return (
    <MobileNavProvider>
      <PortalLayout>
        <Routes>
          <Route path="/portal" element={<PortalDashboardPage />} />
          <Route path="/portal/new" element={<PortalNewTicketPage />} />
          <Route path="/portal/tickets/:id" element={<PortalTicketDetailPage />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </PortalLayout>
    </MobileNavProvider>
  );
}
