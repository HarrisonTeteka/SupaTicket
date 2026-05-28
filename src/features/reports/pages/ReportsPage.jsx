import { TicketExportPanel } from '../components/TicketExportPanel';
import { LogExportPanel } from '../components/LogExportPanel';

/** Reports tab content — stacked export panels for tickets and system logs. */
export default function ReportsPage() {
  return (
    <div className="space-y-6 pt-4 sm:pt-6 md:pt-8">
      <TicketExportPanel />
      <LogExportPanel />
    </div>
  );
}
