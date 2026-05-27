import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Inbox,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCustomer } from '../hooks/useCustomer';
import { useTickets } from '../../tickets/hooks/useTickets';
import { useAuth } from '../../auth/components/AuthGate';
import { useNewTicketModal } from '../../tickets/hooks/useNewTicketModal';
import { deleteCustomer } from '../services/customerService';
import { CustomerEditModal } from '../components/CustomerEditModal';
import { TicketRow } from '../../tickets/components/TicketRow';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useConfirm } from '../../../shared/components/ConfirmProvider';

/** Per-customer page: contact details + all tickets attributed to them. */
export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const { customer, loading, error } = useCustomer(id);
  const { openNewTicket } = useNewTicketModal();

  const ticketFilters = useMemo(
    () => ({ customer_id: id, parentId: null }),
    [id]
  );
  const {
    tickets,
    loading: ticketsLoading,
    error: ticketsError,
  } = useTickets(ticketFilters);

  const [editing, setEditing] = useState(false);
  const [opError, setOpError] = useState('');

  const handleDelete = async () => {
    if (!customer) return;
    const ok = await confirm({
      title: 'Delete customer?',
      message: `Delete ${customer.name}? This unlinks them from any tickets but does not delete the tickets.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setOpError('');
    try {
      await deleteCustomer(customer.id);
      navigate('/customers');
    } catch (err) {
      setOpError(err.message || 'Delete failed.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-white border border-gray-200 rounded-2xl animate-pulse" />
        <div className="h-40 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <EmptyState
        icon={Inbox}
        title="Customer not found"
        description={error || 'This customer no longer exists or you do not have access.'}
        action={
          <Button variant="secondary" onClick={() => navigate('/customers')}>
            <ArrowLeft size={14} /> Back to customers
          </Button>
        }
      />
    );
  }

  const fullAddress = [
    customer.address_line1,
    customer.address_line2,
    [customer.city, customer.state, customer.postal_code].filter(Boolean).join(', '),
    customer.country,
  ]
    .filter((s) => s && s.trim() !== '')
    .join('\n');

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#336021]"
      >
        <ArrowLeft size={15} /> Back to customers
      </Link>

      {opError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {opError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info column */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-black text-[#336021] truncate">
                  {customer.name}
                </h1>
                {customer.company && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                    <Building2 size={13} /> {customer.company}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  External ID: <code>{customer.external_id}</code>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#336021] hover:bg-gray-100"
                  title="Edit customer"
                >
                  <Pencil size={14} />
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                    title="Delete customer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <dl className="text-sm space-y-3 pt-3 border-t border-gray-100">
              {customer.email && (
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-gray-700 hover:text-[#336021] break-all"
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-gray-700 hover:text-[#336021]"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
              {fullAddress && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-gray-700 whitespace-pre-line">{fullAddress}</p>
                </div>
              )}
              {!customer.email && !customer.phone && !fullAddress && (
                <p className="text-sm text-gray-400">No contact details on file.</p>
              )}
            </dl>

            {customer.notes && (
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tickets column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-black text-[#336021] uppercase tracking-wide">
              Tickets {!ticketsLoading && `(${tickets.length})`}
            </h2>
            <Button onClick={() => openNewTicket({ customer })}>
              <Plus size={14} /> Raise ticket
            </Button>
          </div>

          {ticketsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[88px] bg-white border border-gray-200 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : ticketsError ? (
            <EmptyState
              icon={Inbox}
              title="Couldn't load tickets"
              description={ticketsError.message || 'Try refreshing the page.'}
            />
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No Tickets"
              description={`${customer.name} has no tickets yet.`}
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <CustomerEditModal
          customer={customer}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
