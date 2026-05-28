import { Archive, ArchiveRestore, KeyRound, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../../shared/components/Badge';

/** One profile row in the Staff Directory table. */
export function StaffRow({
  profile,
  currentUserId,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onResetPassword,
}) {
  const isSelf = profile.id === currentUserId;
  const archived = profile.status === 'archived';

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-accent text-white text-xs font-bold flex items-center justify-center shrink-0">
            {profile.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-primary truncate">{profile.name}</p>
            <p className="text-xs text-fg-muted truncate">{profile.email}</p>
          </div>
        </div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <Badge
          className={
            profile.role === 'admin'
              ? 'bg-brand-accent/15 text-brand-accent'
              : 'bg-surface-2 text-fg'
          }
        >
          {profile.role}
        </Badge>
      </td>
      <td className="hidden md:table-cell px-4 py-3 text-sm text-fg">{profile.department || '—'}</td>
      <td className="px-4 py-3">
        <Badge
          className={
            archived ? 'bg-surface-2 text-fg-secondary' : 'bg-emerald-100 text-emerald-700'
          }
        >
          {profile.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(profile)}
            className="p-1.5 text-fg-muted hover:text-brand-primary"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          {onResetPassword && (
            <button
              type="button"
              onClick={() => onResetPassword(profile)}
              className="p-1.5 text-fg-muted hover:text-brand-accent"
              title="Reset password"
            >
              <KeyRound size={15} />
            </button>
          )}
          {archived ? (
            <button
              type="button"
              onClick={() => onRestore(profile)}
              className="p-1.5 text-fg-muted hover:text-emerald-600"
              title="Restore"
            >
              <ArchiveRestore size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onArchive(profile)}
              disabled={isSelf}
              className="p-1.5 text-fg-muted hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title={isSelf ? "You can't archive yourself" : 'Archive'}
            >
              <Archive size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(profile)}
            disabled={isSelf}
            className="p-1.5 text-fg-muted hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title={isSelf ? "You can't delete yourself" : 'Delete'}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
