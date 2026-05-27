import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Input, Textarea } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { PermissionsMatrix } from './PermissionsMatrix';
import { createRole, updateRole } from '../services/roleService';
import { ALL_PERMISSIONS } from '../roles.utils';

/**
 * Create / edit a role. System roles have name + description locked but
 * permissions are still editable (an admin can revoke perms from the
 * built-in Staff role, for example, to make agents read-only). The Admin
 * role's permissions stay editable too but the UI warns before saving.
 */
export function RoleEditModal({ role, onClose, onSaved }) {
  const isEdit = !!role?.id;
  const isSystem = !!role?.is_system;
  const isAdminRole = role?.system_name === 'admin';

  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState(role?.permissions || {});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (
      isAdminRole &&
      !ALL_PERMISSIONS.every((k) => permissions[k] === true) &&
      !window.confirm(
        'You are reducing the Admin role\'s permissions. Admins may lose access to parts of the app. Continue?'
      )
    ) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      const saved = isEdit
        ? await updateRole(role.id, {
            name: isSystem ? undefined : name,
            description: isSystem ? undefined : description,
            permissions,
          })
        : await createRole({ name, description, permissions });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save role.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={isEdit ? `Edit ${role.name}` : 'New role'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={save}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        {isSystem && (
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-xl">
            This is a built-in role. Name and description are locked; you can
            still adjust which permissions it grants.
          </div>
        )}

        <Input
          label="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSystem}
        />
        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSystem}
          placeholder="What this role is for. Shown next to it in the assignment dropdown."
        />

        <div>
          <h3 className="text-sm font-black text-brand-primary uppercase tracking-wide mb-3">
            Permissions
          </h3>
          <PermissionsMatrix value={permissions} onChange={setPermissions} />
        </div>
      </div>
    </Modal>
  );
}
