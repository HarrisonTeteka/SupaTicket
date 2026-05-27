/**
 * Centered "nothing here yet" placeholder for empty lists and views.
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-2 text-fg-muted flex items-center justify-center mb-4">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-base font-semibold text-brand-primary">{title}</h3>
      {description && <p className="text-sm text-fg-secondary mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
