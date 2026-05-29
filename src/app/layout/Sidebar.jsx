import { NavLink } from 'react-router-dom';
import { Contact, Flame, LayoutDashboard, Layers, Plus, Settings } from 'lucide-react';
import { useAuth } from '../../features/auth/components/AuthGate';
import { useNewTicketModal } from '../../features/tickets/hooks/useNewTicketModal';
import { useMobileNav } from './useMobileNav';

/**
 * Dark moss-green sidebar carrying the SupaMoto brand chrome.
 *
 * Layout: brand flame + primary nav at the top; admin Settings pinned
 * to the bottom via `mt-auto`.
 *
 * Responsive: on `md+` the sidebar sits in normal flex flow (80px wide).
 * On `<md` it becomes a fixed drawer that slides in from the left, driven by
 * the MobileNav context. The MobileNavBackdrop in AppShell handles the
 * click-outside-to-close behavior; the context auto-closes on route change.
 */
export function Sidebar() {
  const { isAdmin } = useAuth();
  const { openNewTicket } = useNewTicketModal();
  const { isOpen } = useMobileNav();

  return (
    <aside
      className={[
        'fixed md:static inset-y-0 left-0 z-40',
        'w-20 bg-[#264918] flex flex-col items-center py-6 shrink-0 shadow-xl',
        'transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0',
      ].join(' ')}
    >
      {/* Brand flame */}
      <div className="p-2 bg-brand-accent rounded-xl text-white shadow-md shadow-brand-accent/30 mb-8">
        <Flame size={22} fill="currentColor" />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-3">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/tickets" icon={Layers} label="Tickets" />
        <NavItem to="/customers" icon={Contact} label="Customers" />
        <button
          type="button"
          onClick={() => openNewTicket()}
          className="p-3 rounded-xl transition-all text-white/60 hover:text-white hover:bg-surface/10"
          title="Raise Ticket"
        >
          <Plus size={24} />
        </button>
      </nav>

      {/* Bottom cluster: admin Settings */}
      <div className="mt-auto flex flex-col items-center gap-3">
        {isAdmin && <NavItem to="/admin" icon={Settings} label="Settings" />}
      </div>
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
            ? 'bg-white/10 text-white'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`
      }
    >
      <Icon size={22} />
    </NavLink>
  );
}
