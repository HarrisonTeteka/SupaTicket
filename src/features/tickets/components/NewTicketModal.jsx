import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewTicketModal } from '../hooks/useNewTicketModal';
import { useAuth } from '../../auth/components/AuthGate';
import { useToast } from '../../../shared/hooks/useToast';
import { createTicket } from '../services/ticketsService';
import { formatTicketNumber } from '../tickets.utils';
import { TicketForm } from './TicketForm';
import { Modal } from '../../../shared/components/Modal';

/**
 * "Raise Ticket" modal. Mounted once at the AppShell level; opened from the
 * sidebar `+` button (or the sub-ticket shortcut) via useNewTicketModal().
 */
export function NewTicketModal() {
  const { isOpen, prefill, closeNewTicket } = useNewTicketModal();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      const ticket = await createTicket(values, profile);
      closeNewTicket();
      showToast(`Ticket ${formatTicketNumber(ticket.ticket_number)} created`);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.message || 'Could not create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeNewTicket}
      title={prefill?.parent_id ? 'Raise a sub-ticket' : 'Raise a ticket'}
      size="lg"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}
      <TicketForm
        initial={prefill || {}}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Create ticket"
        onCancel={closeNewTicket}
      />
    </Modal>
  );
}
