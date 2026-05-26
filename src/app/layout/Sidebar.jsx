import { NavLink } from 'react-router-dom';
import { Flame, LayoutDashboard, Layers, Plus, Settings } from 'lucide-react';
import { useAuth } from '../../features/auth/components/AuthGate';
import { useNewTicketModal } from '../../features/tickets/hooks/useNewTicketModal';

/**
 * Dark moss-green sidebar carrying the SupaMoto brand chrome. Navigation is
 * route-based (react-router) instead of an in-memory `view` state.
 */
export function Sidebar() {
  const { isAdmin } = useAuth();
  const { openNewTicket } = useNewTicketModal();

  return (
    <aside className="w-20 bg-[#336021] flex flex-col items-center py-6 shrink-0 space-y-8 z-20 shadow-xl relative">
      <div className="p-2 bg-[#F58202] rounded-xl text-white shadow-md shadow-[#F58202]/30">
        <Flame size={22} fill="currentColor" />
      </div>

      <nav className="flex flex-col gap-3">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/tickets" icon={Layers} label="Tickets" />
        <button
          type="button"
          onClick={() => openNewTicket()}
          className="p-3 rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/10"
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
          isActive
            ? 'bg-[#F58202] text-white shadow-md shadow-[#F58202]/30'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`
      }
    >
      <Icon size={22} />
    </NavLink>
  );
}
