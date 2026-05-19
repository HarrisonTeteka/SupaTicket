import { AuthGate } from '../features/auth/components/AuthGate';
import { Sidebar } from './layout/Sidebar';
import { AppRouter } from './router';

/**
 * App entry point composed of three layers:
 *   <Providers> (in main.jsx)  →  <AuthGate>  →  <Sidebar + Routes>
 *
 * AuthGate handles unauthenticated state by rendering the login screen,
 * so anything inside this shell can assume there is a signed-in user.
 */
export default function AppShell() {
  return (
    <AuthGate>
      <div className="flex h-screen bg-[#f5f7f9] text-[#12344d] overflow-hidden">
        <Sidebar />
        <AppRouter />
      </div>
    </AuthGate>
  );
}
