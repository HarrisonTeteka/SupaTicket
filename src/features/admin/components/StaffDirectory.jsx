import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useStaff } from '../hooks/useStaff';
import { useAuth } from '../../auth/components/AuthGate';
import { archiveStaff, deleteStaff, restoreStaff } from '../services/adminService';
import { StaffRow } from './StaffRow';
import { EditProfileModal } from './EditProfileModal';
import { CreateUserModal } from './CreateUserModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/Button';
import { useConfirm } from '../../../shared/components/ConfirmProvider';

/** Staff Directory tab: lists every profile with edit / archive / delete. */
export function StaffDirectory() {
  const { staff, loading } = useStaff();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const canCreate = can && can('users.create');

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  };

  const handleArchive = (p) => run(() => archiveStaff(p.id));
  const handleRestore = (p) => run(() => restoreStaff(p.id));
  const handleDelete = async (p) => {
    const ok = await confirm({
      title: 'Delete staff profile?',
      message: `Delete ${p.name}? This removes their profile.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    run(() => deleteStaff(p.id));
  };

  if (loading) {
    return <div className="h-40 bg-surface border border-line-strong rounded-2xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-fg-secondary">
          {staff.length} user{staff.length === 1 ? '' : 's'}
        </p>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={14} /> Create user
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {staff.length === 0 && (
        <EmptyState icon={Users} title="No staff" description="No profiles found." />
      )}
      {staff.length > 0 && (
      <div className="bg-surface border border-line-strong rounded-2xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-2 text-left text-xs font-semibold text-fg-muted uppercase tracking-widest">
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="hidden sm:table-cell px-4 py-3">Role</th>
              <th scope="col" className="hidden md:table-cell px-4 py-3">Department</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((p) => (
              <StaffRow
                key={p.id}
                profile={p}
                currentUserId={user?.id}
                onEdit={setEditing}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      )}

      {editing && (
        <EditProfileModal
          mode="admin"
          profile={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
    </div>
  );
}
