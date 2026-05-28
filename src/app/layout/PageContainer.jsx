import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';

/**
 * Wraps each staff route in the standard "topbar + scrollable content" layout.
 *
 * Accessibility:
 * - Renders a `<main id="main-content">` so the skip link in AppShell can
 *   target it.
 * - On route change, sets `document.title` from the route title and moves
 *   keyboard focus to the main region so screen reader / keyboard users land
 *   on the new page instead of being stranded mid-document.
 */
export function PageContainer({ title, children }) {
  const mainRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (title) {
      document.title = `${title} — SupaTicket`;
    }
    mainRef.current?.focus();
  }, [location.pathname, title]);

  return (
    <main
      ref={mainRef}
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col min-w-0 overflow-hidden outline-none"
    >
      <Topbar title={title} />
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 relative">{children}</div>
    </main>
  );
}
