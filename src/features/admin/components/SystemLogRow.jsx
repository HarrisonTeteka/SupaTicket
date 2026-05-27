import { formatDateTime } from '../../tickets/tickets.utils';

/** One audit-log entry row. */
export function SystemLogRow({ log }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-brand-primary bg-surface-2 px-2 py-0.5 rounded">
          {log.action_type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-fg">{log.details || '—'}</td>
      <td className="hidden md:table-cell px-4 py-3 text-sm text-fg">{log.user_name || 'Unknown'}</td>
      <td className="hidden sm:table-cell px-4 py-3 text-xs text-fg-muted whitespace-nowrap">
        {formatDateTime(log.created_at)}
      </td>
    </tr>
  );
}
