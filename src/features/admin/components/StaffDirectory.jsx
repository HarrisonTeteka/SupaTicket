import { useState } from 'react';
import { Users } from 'lucide-react';
import { useStaff } from '../hooks/useStaff';
import { useAuth } from '../../auth/components/AuthGate';
import { archiveStaff, deleteStaff, restoreStaff } from '../services/adminService';
import { StaffRow } from './StaffRow';
import { EditProfileModal } from './EditProfileModal';
import { EmptyState } from '../../../shared/components/EmptyState';

/** Staff Directory tab: lists every profile with edit / archive / delete. */
export function StaffDirectory() {
  const { staff, loading } = useStaff();
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

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
  const handleDelete = (p) => {
    if (!window.confirm(`Delete ${p.name}? This removes their profile.`)) return;
    run(() => deleteStaff(p.id));
  };

  if (loading) {
    return <div className="h-40 bg-white border border-gray-200 rounded-2xl animate-pulse" />;
  }

  if (staff.length === 0) {
    return <EmptyState icon={Users} title="No staff" description="No profiles found." />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
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

      {editing && (
        <EditProfileModal
          mode="admin"
          profile={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
