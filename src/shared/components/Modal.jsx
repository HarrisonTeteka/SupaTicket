import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../utils/classNames';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

// Anything inside the dialog that should participate in the Tab cycle.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Centered modal dialog rendered into document.body via a portal.
 *
 * Accessibility:
 * - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` linked to the
 *   visible title heading so screen readers announce the dialog correctly.
 * - Closes on Escape and on backdrop click.
 * - On open, focus moves into the dialog and is trapped (Tab / Shift+Tab
 *   cycle inside the dialog).
 * - On close, focus is restored to whatever element opened it (so keyboard
 *   users don't get dumped back to <body>).
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    // Focus the dialog container itself. Screen readers announce the dialog
    // (via aria-labelledby + aria-modal); sighted keyboard users press Tab
    // to step into the first interactive control.
    dialogRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!nodes || nodes.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      const toRestore = previouslyFocused.current;
      if (toRestore && typeof toRestore.focus === 'function') {
        toRestore.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'w-full bg-surface rounded-3xl shadow-2xl flex flex-col max-h-[90vh] outline-none',
          SIZES[size]
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-brand-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-line flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
