import { Download, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { getAttachmentUrl, removeAttachment } from '../services/attachmentsService';
import { formatBytes } from '../tickets.utils';

/**
 * Lists a ticket's attachments. Clicking one opens a signed URL; admins can
 * delete. `onChange` receives the new attachments array after a delete.
 */
export function AttachmentList({ ticket, onChange }) {
  const { isAdmin } = useAuth();
  const attachments = ticket.attachments ?? [];

  const open = async (path) => {
    try {
      const url = await getAttachmentUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      /* ignore — signed URL failed */
    }
  };

  const remove = async (path) => {
    try {
      const next = await removeAttachment(ticket, path);
      onChange?.(next);
    } catch {
      /* ignore — realtime will reconcile */
    }
  };

  if (attachments.length === 0) {
    return <p className="text-sm text-gray-400">No attachments.</p>;
  }

  return (
    <ul className="space-y-2">
      {attachments.map((a) => (
        <li key={a.path} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
          <FileText size={16} className="text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#12344d] truncate">{a.name}</p>
            <p className="text-[11px] text-gray-400">{formatBytes(a.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => open(a.path)}
            className="p-1.5 text-gray-400 hover:text-[#12344d]"
            title="Open"
          >
            <Download size={15} />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => remove(a.path)}
              className="p-1.5 text-gray-300 hover:text-red-500"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
