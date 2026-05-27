import { useState } from 'react';
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { useAuth } from '../../auth/components/AuthGate';
import { deleteRole } from '../services/roleService';
import { RoleEditModal } from './RoleEditModal';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { countPermissions, ALL_PERMISSIONS } from '../roles.utils';

/** Admin Roles tab: list roles + create / edit / delete. */
export function RolesEditor() {
  const { can } = useAuth();
  const { roles, loading, error } = useRoles();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, role = edit
  const [opError, setOpError] = useState('');

  const canManage = can ? can('roles.manage') : false;

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete the "${r.name}" role? Users assigned to it lose all permissions until reassigned.`)) {
      return;
    }
    setOpError('');
    try {
      await deleteRole(r.id);
    } catch (err) {
      setOpError(err.message || 'Delete failed.');
    }
  };

  if (loading) {
    return <div className="h-40 bg-white border border-gray-200 rounded-2xl animate-pulse" />;
  }
  if (error) {
    return (
      <EmptyState
        icon={Shield}
        title="Couldn't load roles"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {roles.length} role{roles.length === 1 ? '' : 's'} ·{' '}
          <span className="text-gray-400">{ALL_PERMISSIONS.length} permission keys</span>
        </p>
        {canManage && (
          <Button onClick={() => setEditing({})}>
            <Plus size={14} /> New role
          </Button>
        )}
      </div>

      {opError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {opError}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const granted = countPermissions(r.permissions);
              return (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#336021]">{r.name}</p>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.is_system ? (
                      <span className="text-[11px] font-bold bg-[#336021]/10 text-[#336021] px-1.5 py-0.5 rounded">
                        Built-in
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-bold text-gray-700">{granted}</span>
                    <span className="text-gray-400"> / {ALL_PERMISSIONS.length}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        disabled={!canManage}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#336021] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Edit permissions"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        disabled={!canManage || r.is_system}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={r.is_system ? 'System roles cannot be deleted' : 'Delete role'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!canManage && (
        <p className="text-xs text-gray-400">
          You need the <code>roles.manage</code> permission to create or edit roles.
        </p>
      )}

      {editing !== null && (
        <RoleEditModal
          role={editing.id ? editing : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
