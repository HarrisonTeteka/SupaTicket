import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Input, Textarea } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/components/AuthGate';
import { createCustomer, updateCustomer } from '../services/customerService';

/**
 * Create / edit a customer record. `customer=null` opens it in create mode;
 * passing a record opens it in edit mode keyed on `customer.id`.
 */
export function CustomerEditModal({ customer, onClose, onSaved }) {
  const isEdit = !!customer?.id;
  const { profile } = useAuth();

  const [form, setForm] = useState(() => ({
    external_id: customer?.external_id || '',
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    company: customer?.company || '',
    address_line1: customer?.address_line1 || '',
    address_line2: customer?.address_line2 || '',
    city: customer?.city || '',
    state: customer?.state || '',
    postal_code: customer?.postal_code || '',
    country: customer?.country || '',
    notes: customer?.notes || '',
  }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.external_id.trim()) next.external_id = 'Required.';
    if (!form.name.trim()) next.name = 'Required.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Invalid email.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    setServerError('');
    try {
      const saved = isEdit
        ? await updateCustomer(customer.id, form)
        : await createCustomer(form, profile);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Could not save customer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit ${customer.name}` : 'New customer'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={save}>{isEdit ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="External ID *"
            name="external_id"
            value={form.external_id}
            onChange={set('external_id')}
            placeholder="CRM-001"
            error={errors.external_id}
            disabled={isEdit}
          />
          <Input
            label="Name *"
            name="name"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" name="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Phone" name="phone" value={form.phone} onChange={set('phone')} />
        </div>

        <Input label="Company" name="company" value={form.company} onChange={set('company')} />

        <div className="pt-2 border-t border-line">
          <h4 className="text-xs font-black text-fg-muted uppercase tracking-widest mb-3">
            Address
          </h4>
          <div className="space-y-4">
            <Input label="Line 1" name="address_line1" value={form.address_line1} onChange={set('address_line1')} />
            <Input label="Line 2" name="address_line2" value={form.address_line2} onChange={set('address_line2')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="City" name="city" value={form.city} onChange={set('city')} />
              <Input label="State / Region" name="state" value={form.state} onChange={set('state')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Postal code" name="postal_code" value={form.postal_code} onChange={set('postal_code')} />
              <Input label="Country" name="country" value={form.country} onChange={set('country')} />
            </div>
          </div>
        </div>

        <Textarea
          label="Notes"
          name="notes"
          rows={3}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Anything staff should know."
        />

        {isEdit && (
          <p className="text-[11px] text-fg-muted">
            External ID is locked to keep CRM sync stable. To rebind, delete and re-import.
          </p>
        )}
      </div>
    </Modal>
  );
}
