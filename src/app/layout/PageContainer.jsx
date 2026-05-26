import { Topbar } from './Topbar';

/**
 * Wraps each route in the standard "topbar + scrollable content" layout.
 * Lets the feature pages stay focused on their own concerns.
 */
export function PageContainer({ title, children }) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Topbar title={title} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">{children}</div>
    </main>
  );
}
