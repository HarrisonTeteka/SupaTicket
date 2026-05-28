import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, Pencil, Plus, Search, Trash2, Upload, Users } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useAuth } from '../../auth/components/AuthGate';
import { deleteCustomer } from '../services/customerService';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerImportModal } from './CustomerImportModal';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useConfirm } from '../../../shared/components/ConfirmProvider';

/** Customers tab / page — list, search, edit, delete, CSV import.
 *  Write actions are gated on the granular permissions from useAuth().can(). */
export function CustomersList() {
  const { isAdmin, can } = useAuth();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const { customers, loading, error } = useCustomers(search);
  const [editing, setEditing] = useState(null); // null=closed, {} = create, {id} = edit
  const [importing, setImporting] = useState(false);
  const [opError, setOpError] = useState('');

  const canCreate = can && can('customers.create');
  const canEdit = can && can('customers.edit');
  const canImport = can && can('customers.import');
  const canDelete = isAdmin; // RLS keeps DELETE admin-only

  const handleDelete = async (c) => {
    const ok = await confirm({
      title: 'Delete customer?',
      message: `Delete ${c.name}? This unlinks them from any tickets they're attached to.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setOpError('');
    try {
      await deleteCustomer(c.id);
    } catch (err) {
      setOpError(err.message || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 bg-surface py-3 -my-3 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company, external ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-line-strong bg-surface-2 focus:bg-surface outline-none focus:ring-2 focus:ring-brand-accent text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canImport && (
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload size={14} /> Import CSV
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setEditing({})}>
              <Plus size={14} /> New customer
            </Button>
          )}
        </div>
      </div>

      {(opError || error) && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {opError || error}
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-surface border border-line-strong rounded-2xl animate-pulse" />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matches' : 'No customers yet'}
          description={
            search
              ? 'Try a different search term, or clear the filter.'
              : 'Import from a CSV or add a customer manually to link tickets to them.'
          }
        />
      ) : (
        <div className="bg-surface border border-line-strong rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 text-left text-xs font-black text-fg-muted uppercase tracking-widest">
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="hidden md:table-cell px-4 py-3">Contact</th>
                <th scope="col" className="hidden md:table-cell px-4 py-3">Location</th>
                <th scope="col" className="hidden sm:table-cell px-4 py-3">External ID</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-bold text-brand-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.company && (
                      <p className="text-xs text-fg-secondary flex items-center gap-1 mt-0.5">
                        <Building2 size={11} /> {c.company}
                      </p>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-fg">
                    {c.email && (
                      <p className="flex items-center gap-1 truncate">
                        <Mail size={11} className="text-fg-muted shrink-0" /> {c.email}
                      </p>
                    )}
                    {c.phone && (
                      <p className="flex items-center gap-1 text-fg-secondary mt-0.5">
                        <Phone size={11} className="text-fg-muted shrink-0" /> {c.phone}
                      </p>
                    )}
                    {!c.email && !c.phone && <span className="text-fg-muted">—</span>}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-fg">
                    {[c.city, c.country].filter(Boolean).join(', ') || (
                      <span className="text-fg-muted">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    <code className="text-xs text-fg-secondary">{c.external_id}</code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-brand-primary hover:bg-surface-2"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <CustomerEditModal
          customer={editing.id ? editing : null}
          onClose={() => setEditing(null)}
        />
      )}

      <CustomerImportModal
        open={importing}
        onClose={() => setImporting(false)}
      />
    </div>
  );
}
