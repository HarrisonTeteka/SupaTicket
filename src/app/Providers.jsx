import { BrowserRouter } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { ToastProvider, useToast } from '../shared/hooks/useToast';

/**
 * Cross-cutting providers wrap the whole app. Add new global context
 * providers here (e.g. theme, feature flags) instead of in main.jsx.
 */
export function Providers({ children }) {
  return (
    <BrowserRouter>
      <ToastProvider>
        {children}
        <ToastHost />
      </ToastProvider>
    </BrowserRouter>
  );
}

function ToastHost() {
  const { message } = useToast();
  // The live region must exist in the DOM at all times so assistive tech can
  // subscribe to it. Conditionally render only the toast content inside.
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
    >
      {message && (
        <div className="px-6 py-3 bg-gray-900 text-white rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">{message}</span>
        </div>
      )}
    </div>
  );
}
