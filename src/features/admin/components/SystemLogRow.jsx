import { formatDateTime } from '../../tickets/tickets.utils';

/** One audit-log entry row. */
export function SystemLogRow({ log }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-[#336021] bg-gray-100 px-2 py-0.5 rounded">
          {log.action_type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{log.details || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{log.user_name || 'Unknown'}</td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {formatDateTime(log.created_at)}
      </td>
    </tr>
  );
}
