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
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 bg-gray-900 text-white rounded-full shadow-2xl flex items-center gap-3">
      <CheckCircle2 size={18} className="text-emerald-400" />
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
}
