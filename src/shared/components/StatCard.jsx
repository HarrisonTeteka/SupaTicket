import { cn } from '../utils/classNames';

const ICON_COLORS = {
  moss:      'text-brand-primary',
  tangerine: 'text-brand-accent',
  cream:     'text-brand-pending',
  green:     'text-emerald-500',
  amber:     'text-amber-500',
  red:       'text-brand-danger',
  gray:      'text-fg-secondary',
};

/** Compact KPI card: an icon chip, a big value and a label. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'tangerine' }) {
  return (
    <div className="bg-surface border border-line-strong rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:-translate-y-0.5 transition-all h-full">
      {Icon && (
        <Icon size={20} className={cn(ICON_COLORS[tone] || ICON_COLORS.tangerine, 'shrink-0')} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xl sm:text-2xl font-bold text-brand-primary leading-none mb-1">{value}</p>
        <p className="text-[11px] font-bold text-fg-secondary uppercase tracking-wider truncate">
          {label}
        </p>
        {hint && <p className="text-[11px] text-fg-muted mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
