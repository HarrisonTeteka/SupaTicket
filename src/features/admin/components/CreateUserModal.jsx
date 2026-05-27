import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { useAppConfig } from '../hooks/useAppConfig';
import { useRoles } from '../../roles/hooks/useRoles';
import { createUserAsAdmin } from '../services/createUserService';

/**
 * Admin-only "Create user" modal. Calls the admin-create-user Edge Function
 * which uses the service role to provision an auth user and link them to
 * the chosen role.
 */
export function CreateUserModal({ onClose, onCreated }) {
  const { config } = useAppConfig();
  const { roles, loading: rolesLoading } = useRoles();

  // Customers self-sign-up via the portal; this UI is for staff/agent users.
  const staffRoles = useMemo(
    () => roles.filter((r) => r.system_name !== 'customer'),
    [roles]
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [department, setDepartment] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setWarning('');
    if (!name.trim()) return setError('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('Valid email is required.');
    }
    if (!roleId) return setError('Pick a role.');

    setBusy(true);
    try {
      const result = await createUserAsAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role_id: roleId,
        department: department || null,
        send_invite: sendInvite,
      });
      if (result?.warning) setWarning(result.warning);
      onCreated?.(result);
      if (!result?.warning) onClose();
    } catch (err) {
      setError(err.message || 'Could not create user.');
    } finally {
      setBusy(false);
    }
  };

  const roleOptions = staffRoles.map((r) => ({ value: r.id, label: r.name }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Create user"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={submit}>Create user</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}
        {warning && (
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-xl">
            {warning}
          </div>
        )}

        <Input
          label="Full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />
        <Input
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
        />

        <Select
          label="Role *"
          options={roleOptions}
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          placeholder={rolesLoading ? 'Loading roles...' : 'Select a role'}
        />

        <Select
          label="Department"
          placeholder="No department"
          options={config.departments || []}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />

        <label className="flex items-start gap-2 text-sm cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-gray-700">
            Email a magic-link invite
            <span className="block text-[11px] font-normal text-gray-400 mt-0.5">
              Recommended. They set their own password via the link.
            </span>
          </span>
        </label>

        <p className="text-[11px] text-gray-400">
          Roles control what this user can do. Edit roles under Admin → Roles.
        </p>
      </form>
    </Modal>
  );
}
