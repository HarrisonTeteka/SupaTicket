import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, useAuth } from '../features/auth/components/AuthGate';
import { Sidebar } from './layout/Sidebar';
import { AppRouter } from './router';
import { MobileNavProvider, useMobileNav } from './layout/useMobileNav';
import { NewTicketModalProvider } from '../features/tickets/hooks/useNewTicketModal';
import { NewTicketModal } from '../features/tickets/components/NewTicketModal';
import { PortalLayout } from '../features/portal/components/PortalLayout';
import { ConfirmProvider } from '../shared/components/ConfirmProvider';

// Lazy-load portal pages — customers never need the staff bundles and vice
// versa. PortalLayout stays eager so the chrome renders immediately.
const PortalDashboardPage = lazy(() => import('../features/portal/pages/PortalDashboardPage'));
const PortalNewTicketPage = lazy(() => import('../features/portal/pages/PortalNewTicketPage'));
const PortalTicketDetailPage = lazy(() => import('../features/portal/pages/PortalTicketDetailPage'));

/**
 * App entry point composed of these layers:
 *
 *   <Providers> (in main.jsx)  →  <AuthGate>  →  <RoleAwareShell>
 *     ├─ <PortalShell>   (customer)
 *     └─ <StaffShell>    (staff / admin)
 */
export default function AppShell() {
  return (
    <AuthGate>
      <ConfirmProvider>
        <RoleAwareShell />
      </ConfirmProvider>
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
        <Suspense fallback={<PortalLoader />}>
          <Routes>
            <Route path="/portal" element={<PortalDashboardPage />} />
            <Route path="/portal/new" element={<PortalNewTicketPage />} />
            <Route path="/portal/tickets/:id" element={<PortalTicketDetailPage />} />
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </Suspense>
      </PortalLayout>
    </MobileNavProvider>
  );
}

function PortalLoader() {
  return (
    <div className="space-y-3">
      <div className="h-24 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      <div className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />
    </div>
  );
}
