import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../features/auth/components/AuthGate';
import { Badge } from '../../shared/components/Badge';
import { useTicketSearch } from '../../features/tickets/hooks/useTicketSearch';
import { StatusBadge } from '../../features/tickets/components/StatusBadge';
import { formatTicketNumber } from '../../features/tickets/tickets.utils';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';

/**
 * Top header bar. `title` is supplied per-page by PageContainer. The search
 * box runs a debounced ticket search; picking a result navigates to it.
 */
export function Topbar({ title }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { results, loading } = useTicketSearch(query);

  const go = (id) => {
    setQuery('');
    setFocused(false);
    navigate(`/tickets/${id}`);
  };

  const showDropdown = focused && query.trim().length > 0;

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black tracking-tight capitalize text-[#336021]">{title}</h1>
        {isAdmin && (
          <Badge className="bg-[#F58202]/10 text-[#F58202] border border-[#F58202]/20">
            Admin Mode
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search ticket ID or keyword..."
            className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm border border-transparent w-64 outline-none focus:bg-white focus:border-gray-200 transition-all"
          />
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-40">
              {loading && (
                <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
              )}
              {!loading && results.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">No tickets found.</p>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={() => go(t.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-xs font-bold text-gray-400 shrink-0">
                    {formatTicketNumber(t.ticket_number)}
                  </span>
                  <span className="text-sm text-[#336021] font-medium truncate flex-1">
                    {t.title}
                  </span>
                  <StatusBadge status={t.status} />
                </button>
              ))}
            </div>
          )}
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}
