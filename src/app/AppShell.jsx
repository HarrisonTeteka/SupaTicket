import { AuthGate } from '../features/auth/components/AuthGate';
import { Sidebar } from './layout/Sidebar';
import { AppRouter } from './router';
import { NewTicketModalProvider } from '../features/tickets/hooks/useNewTicketModal';
import { NewTicketModal } from '../features/tickets/components/NewTicketModal';

/**
 * App entry point composed of these layers:
 *   <Providers> (in main.jsx)  →  <AuthGate>  →  <NewTicketModalProvider>
 *   →  <Sidebar + Routes>  +  <NewTicketModal>
 *
 * AuthGate handles unauthenticated state by rendering the login screen, so
 * anything inside this shell can assume there is a signed-in user. The
 * "Raise Ticket" modal mounts here so it overlays any route.
 */
export default function AppShell() {
  return (
    <AuthGate>
      <NewTicketModalProvider>
        <div className="flex h-screen bg-[#f5f7f9] text-[#12344d] overflow-hidden">
          <Sidebar />
          <AppRouter />
        </div>
        <NewTicketModal />
      </NewTicketModalProvider>
    </AuthGate>
  );
}
