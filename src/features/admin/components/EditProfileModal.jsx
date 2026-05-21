import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { useAppConfig } from '../hooks/useAppConfig';
import { updateOwnProfile, updateProfileAsAdmin } from '../services/adminService';

/**
 * Edit a profile in one of two modes:
 *  - mode="self":  the signed-in user edits their own name only.
 *  - mode="admin": an admin edits name, role, status and department.
 *
 * Mount this conditionally (render only while editing) so its form state is
 * fresh each time it opens.
 */
export function EditProfileModal({ mode = 'self', profile, onClose, onSaved }) {
  const { config } = useAppConfig();
  const isAdminMode = mode === 'admin';

  const [name, setName] = useState(profile?.name || '');
  const [role, setRole] = useState(profile?.role || 'staff');
  const [status, setStatus] = useState(profile?.status || 'active');
  const [department, setDepartment] = useState(profile?.department || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!profile) return null;

  const save = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (isAdminMode) {
        await updateProfileAsAdmin(profile.id, {
          name: name.trim(),
          role,
          status,
          department: department || null,
        });
      } else {
        await updateOwnProfile(profile.id, { name: name.trim() });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isAdminMode ? `Edit ${profile.name}` : 'Edit your profile'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" value={profile.email} disabled />
        {isAdminMode && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Role"
                options={['admin', 'staff']}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
              <Select
                label="Status"
                options={['active', 'archived']}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <Select
              label="Department"
              placeholder="No department"
              options={config.departments}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </>
        )}
        {!isAdminMode && (
          <p className="text-[11px] text-gray-400">
            Only an admin can change your role, status or department.
          </p>
        )}
      </div>
    </Modal>
  );
}
