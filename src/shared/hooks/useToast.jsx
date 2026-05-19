import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Minimal global toast. Replaces Gemini's setToastMessage / setTimeout pattern
 * with a context so any component can call showToast() without prop drilling.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast('Saved');
 */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  const showToast = useCallback((next) => {
    setMessage(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(''), 3500);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <ToastContext.Provider value={{ showToast, message }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Allow components to call showToast even before the provider is mounted
    // (no-op fallback so unit tests don't blow up).
    return { showToast: () => {}, message: '' };
  }
  return ctx;
}
