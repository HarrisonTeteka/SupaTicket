import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { signOut } from '../../auth/services/authService';
import { NotificationBell } from '../../notifications/components/NotificationBell';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

function portalTitleFor(pathname) {
  if (pathname.startsWith('/portal/tickets/')) return 'Ticket';
  if (pathname === '/portal/new') return 'Raise Ticket';
  if (pathname === '/portal') return 'My Tickets';
  return 'Portal';
}

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
  const mainRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    document.title = `${portalTitleFor(location.pathname)} — SupaTicket`;
    mainRef.current?.focus();
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-app via-surface to-brand-pending/30 text-brand-primary">
      <header className="h-16 bg-surface border-b border-line-strong px-3 sm:px-6 flex items-center justify-between shadow-sm gap-2">
        <Link to="/portal" className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <img src="/supamoto-logo.svg" alt="SupaMoto" className="h-8 sm:h-9" />
          <span className="hidden sm:inline font-semibold text-lg tracking-tight text-brand-primary">
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
                  ? 'bg-brand-pending text-brand-primary'
                  : 'text-fg-secondary hover:text-brand-primary'
              }`
            }
          >
            My Tickets
          </NavLink>
          <Link
            to="/portal/new"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-brand-accent text-white rounded-xl text-sm font-bold hover:bg-brand-accent-hover transition-all shadow-md shadow-brand-accent/30"
            title="Raise ticket"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Raise ticket</span>
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <NotificationBell />
          <div className="flex items-center gap-2 sm:pl-3 sm:border-l border-line-strong">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-brand-primary leading-tight truncate max-w-[160px]">
                {profile?.name}
              </p>
              <p className="text-[10px] text-fg-muted truncate max-w-[160px]">
                {profile?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-lg text-fg-muted hover:text-brand-danger hover:bg-brand-danger/10 transition-all"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="max-w-5xl mx-auto p-4 sm:p-6 outline-none"
      >
        {children}
      </main>
    </div>
  );
}
