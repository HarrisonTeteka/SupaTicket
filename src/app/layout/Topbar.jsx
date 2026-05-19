import { Search } from 'lucide-react';
import { useAuth } from '../../features/auth/components/AuthGate';
import { Badge } from '../../shared/components/Badge';

/**
 * Top header bar. `title` is supplied per-page by PageContainer.
 * The search box is wired in Phase 2 (tickets feature). For now it's visual.
 */
export function Topbar({ title }) {
  const { isAdmin } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight capitalize">{title}</h1>
        {isAdmin && <Badge className="bg-indigo-100 text-indigo-700">Admin Mode</Badge>}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            placeholder="Search ticket ID or keyword..."
            disabled
            className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-transparent w-64 outline-none cursor-not-allowed text-gray-400"
          />
        </div>
      </div>
    </header>
  );
}
