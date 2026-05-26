import { Link, NavLink } from 'react-router-dom';
import { LogOut, Plus, Ticket } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { signOut } from '../../auth/services/authService';
import { NotificationBell } from '../../notifications/components/NotificationBell';

/**
 * Customer-facing chrome — a slim top bar with the logo, "My Tickets" link,
 * a "Raise Ticket" button, notifications bell, and a profile / sign-out area.
 * No staff sidebar. Children render the routed page.
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
    <div className="min-h-screen bg-[#f5f7f9] text-[#12344d]">
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
        <Link to="/portal" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#12344d] text-white rounded-xl flex items-center justify-center shadow">
            <Ticket size={18} />
          </div>
          <span className="font-black text-lg tracking-tight">SupaTicket</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive ? 'bg-gray-100 text-[#12344d]' : 'text-gray-500 hover:text-[#12344d]'
              }`
            }
          >
            My Tickets
          </NavLink>
          <Link
            to="/portal/new"
            className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#12344d] text-white rounded-xl text-sm font-bold hover:bg-[#0d273a] transition-all shadow"
          >
            <Plus size={14} /> Raise ticket
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#12344d] leading-tight">{profile?.name}</p>
              <p className="text-[10px] text-gray-400">{profile?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
