import { createContext, useCallback, useContext, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Promise-based confirm dialog. Replaces native window.confirm so dialogs
 * match the app's branding, work consistently on mobile, and let callers
 * choose a danger variant + custom button labels.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete user?',
 *     message: `Remove ${name}? This unlinks them from any tickets.`,
 *     confirmLabel: 'Delete',
 *     danger: true,
 *   });
 *   if (!ok) return;
 */

const ConfirmContext = createContext(null);

const DEFAULTS = {
  title: 'Are you sure?',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ ...DEFAULTS, open: false, resolver: null });

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({ ...DEFAULTS, ...opts, open: true, resolver: resolve });
    });
  }, []);

  const close = (result) => {
    state.resolver?.(result);
    setState((s) => ({ ...s, open: false, resolver: null }));
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state.open}
        onClose={() => close(false)}
        title={state.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              {state.cancelLabel}
            </Button>
            <Button
              variant={state.danger ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {state.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{state.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
