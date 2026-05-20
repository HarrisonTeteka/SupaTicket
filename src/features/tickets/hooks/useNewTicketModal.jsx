import { createContext, useContext, useMemo, useState } from 'react';

/**
 * Global open/close state for the "Raise Ticket" modal.
 *
 * The sidebar `+` button calls `openNewTicket()`; `NewTicketModal` mounts once
 * at the AppShell level and reads this context so it overlays any page.
 * `openNewTicket(seed)` accepts an optional prefill (e.g. `{ parent_id }` when
 * raising a sub-ticket).
 */
const NewTicketModalContext = createContext(null);

export function NewTicketModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const value = useMemo(
    () => ({
      isOpen,
      prefill,
      openNewTicket: (seed = null) => {
        setPrefill(seed);
        setIsOpen(true);
      },
      closeNewTicket: () => setIsOpen(false),
    }),
    [isOpen, prefill]
  );

  return (
    <NewTicketModalContext.Provider value={value}>
      {children}
    </NewTicketModalContext.Provider>
  );
}

export function useNewTicketModal() {
  const ctx = useContext(NewTicketModalContext);
  if (!ctx) {
    throw new Error('useNewTicketModal must be used within <NewTicketModalProvider>');
  }
  return ctx;
}
