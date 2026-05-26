import { useCallback, useState } from 'react';

/**
 * Minimal wrapper around an async export operation: handles a busy flag and
 * surfaces any thrown error as a string. The caller passes the actual
 * fetch-build-download routine.
 */
export function useExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (operation) => {
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (err) {
      setError(err?.message || 'Export failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
