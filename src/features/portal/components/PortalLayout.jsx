import { Link, NavLink } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { signOut } from '../../auth/services/authService';
import { NotificationBell } from '../../notifications/components/NotificationBell';

/**
 * Customer-facing chrome — a slim top bar with the SupaMoto logo, "My Tickets"
 * link, a "Raise Ticket" button, notifications bell, and a sign-out area.
 * No staff sidebar. Children render the routed page.
 *
 * Responsive: brand wordmark hides on <sm, "Raise ticket" label collapses to
 * an icon on <sm, profile name+email hides on <sm.
 */
export function PortalLayout({ children }) {
  const { profile } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7f9] via-white to-[#F9EDCC]/30 text-[#336021]">
      <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shadow-sm gap-2">
        <Link to="/portal" className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <img src="/supamoto-logo.svg" alt="SupaMoto" className="h-8 sm:h-9" />
          <span className="hidden sm:inline font-semibold text-lg tracking-tight text-[#336021]">
            SupaTicket
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `px-2 sm:px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-[#F9EDCC] text-[#336021]'
                  : 'text-gray-500 hover:text-[#336021]'
              }`
            }
          >
            My Tickets
          </NavLink>
          <Link
            to="/portal/new"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#F58202] text-white rounded-xl text-sm font-bold hover:bg-[#d97002] transition-all shadow-md shadow-[#F58202]/30"
            title="Raise ticket"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Raise ticket</span>
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell />
          <div className="flex items-center gap-2 sm:pl-3 sm:border-l border-gray-200">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-[#336021] leading-tight truncate max-w-[160px]">
                {profile?.name}
              </p>
              <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                {profile?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-lg text-gray-400 hover:text-[#9E2A2B] hover:bg-[#9E2A2B]/10 transition-all"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
