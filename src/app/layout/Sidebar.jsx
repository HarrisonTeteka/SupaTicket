import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, Plus, Settings, Ticket } from 'lucide-react';
import { useAuth } from '../../features/auth/components/AuthGate';
import { ProfileMenu } from '../../features/auth/components/ProfileMenu';

/**
 * Dark navy sidebar that mirrors Gemini's visual language. Navigation is
 * route-based (react-router) instead of an in-memory `view` state.
 */
export function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-20 bg-[#12344d] flex flex-col items-center py-6 shrink-0 space-y-8 z-20 shadow-xl relative">
      <ProfileMenu />

      <div className="p-2 bg-white/10 rounded-lg text-white">
        <Ticket size={24} />
      </div>

      <nav className="flex flex-col gap-6">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/tickets" icon={Layers} label="Tickets" />
        {/* "Raise ticket" — wired in Phase 2 */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('supaticket:new-ticket'))}
          className="p-3 rounded-xl transition-all text-white/50 hover:text-white"
          title="Raise Ticket"
        >
          <Plus size={24} />
        </button>
        {isAdmin && <NavItem to="/admin" icon={Settings} label="Settings" />}
      </nav>
    </aside>
  );
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `p-3 rounded-xl transition-all ${
          isActive ? 'bg-[#2d4e68] text-white' : 'text-white/50 hover:text-white'
        }`
      }
    >
      <Icon size={24} />
    </NavLink>
  );
}
