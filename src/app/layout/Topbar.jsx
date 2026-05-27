import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { useAuth } from '../../features/auth/components/AuthGate';
import { Badge } from '../../shared/components/Badge';
import { useTicketSearch } from '../../features/tickets/hooks/useTicketSearch';
import { StatusBadge } from '../../features/tickets/components/StatusBadge';
import { formatTicketNumber } from '../../features/tickets/tickets.utils';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { useMobileNav } from './useMobileNav';

/**
 * Top header bar. `title` is supplied per-page by PageContainer.
 * Responsive: hamburger button shown on <md to open the mobile sidebar.
 * Search collapses to an icon-trigger on small screens, expanding to a
 * full-width overlay when opened.
 */
export function Topbar({ title }) {
  const { isAdmin } = useAuth();
  const { open: openNav } = useMobileNav();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { results, loading } = useTicketSearch(query);

  const go = (id) => {
    setQuery('');
    setFocused(false);
    setMobileSearchOpen(false);
    navigate(`/tickets/${id}`);
  };

  const showDropdown = focused && query.trim().length > 0;

  return (
    <header className="h-16 bg-surface border-b border-line-strong px-4 sm:px-6 md:px-8 flex items-center justify-between shadow-sm shrink-0 gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={openNav}
          className="md:hidden p-2 -ml-1 rounded-lg text-fg-secondary hover:text-brand-primary hover:bg-surface-2 transition-all shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight capitalize text-brand-primary truncate">
          {title}
        </h1>
        {isAdmin && (
          <Badge className="hidden sm:inline-flex bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shrink-0">
            Admin Mode
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Desktop / tablet search: inline input */}
        <div className="relative hidden sm:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
            size={16}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search ticket ID or keyword..."
            className="pl-10 pr-4 py-2 bg-surface-2 rounded-lg text-sm border border-transparent w-48 md:w-64 outline-none focus:bg-surface focus:border-line-strong transition-all"
          />
          {showDropdown && (
            <SearchDropdown results={results} loading={loading} onPick={go} />
          )}
        </div>

        {/* Mobile search: icon button toggles a full-width overlay */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden p-2 rounded-lg text-fg-secondary hover:text-brand-primary hover:bg-surface-2 transition-all"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        <ThemeToggle />
        <NotificationBell />
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileSearchOpen(false)}>
          <div
            className="bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                size={16}
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ticket ID or keyword..."
                className="w-full pl-10 pr-4 py-3 bg-surface-2 rounded-lg text-sm outline-none focus:bg-surface border border-line-strong"
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-fg-secondary px-2 py-1"
              >
                Close
              </button>
            </div>
            {query.trim() && (
              <div className="mt-3 bg-surface rounded-xl border border-line-strong overflow-hidden">
                {loading && (
                  <p className="px-4 py-3 text-sm text-fg-muted">Searching...</p>
                )}
                {!loading && results.length === 0 && (
                  <p className="px-4 py-3 text-sm text-fg-muted">No tickets found.</p>
                )}
                {results.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => go(t.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-2 flex items-center gap-2"
                  >
                    <span className="text-xs font-bold text-fg-muted shrink-0">
                      {formatTicketNumber(t.ticket_number)}
                    </span>
                    <span className="text-sm text-brand-primary font-medium truncate flex-1">
                      {t.title}
                    </span>
                    <StatusBadge status={t.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SearchDropdown({ results, loading, onPick }) {
  return (
    <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface rounded-xl border border-line-strong shadow-xl overflow-hidden z-40">
      {loading && <p className="px-4 py-3 text-sm text-fg-muted">Searching...</p>}
      {!loading && results.length === 0 && (
        <p className="px-4 py-3 text-sm text-fg-muted">No tickets found.</p>
      )}
      {results.map((t) => (
        <button
          key={t.id}
          type="button"
          onMouseDown={() => onPick(t.id)}
          className="w-full text-left px-4 py-2.5 hover:bg-surface-2 flex items-center gap-2"
        >
          <span className="text-xs font-bold text-fg-muted shrink-0">
            {formatTicketNumber(t.ticket_number)}
          </span>
          <span className="text-sm text-brand-primary font-medium truncate flex-1">
            {t.title}
          </span>
          <StatusBadge status={t.status} />
        </button>
      ))}
    </div>
  );
}
