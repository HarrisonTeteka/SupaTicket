import { cn } from '../utils/classNames';

const TONES = {
  // Brand-aligned tones — moss green primary, tangerine accent, auburn alert.
  moss: 'bg-brand-primary text-white',
  tangerine: 'bg-brand-accent text-white',
  cream: 'bg-brand-pending text-brand-danger',
  green: 'bg-emerald-100 text-brand-primary',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-brand-danger/10 text-brand-danger',
  gray: 'bg-surface-2 text-fg',
};

/** Compact KPI card: an icon chip, a big value and a label. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'tangerine' }) {
  return (
    <div className="bg-surface border border-line-strong rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md shadow-gray-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      {Icon && (
        <div
          className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
            TONES[tone] || TONES.tangerine
          )}
        >
          <Icon size={20} className="sm:hidden" />
          <Icon size={22} className="hidden sm:block" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-2xl sm:text-3xl font-black text-brand-primary leading-none mb-1">{value}</p>
        <p className="text-[11px] font-bold text-fg-secondary uppercase tracking-wider truncate">
          {label}
        </p>
        {hint && <p className="text-[11px] text-fg-muted mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
