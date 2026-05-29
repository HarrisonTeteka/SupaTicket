/**
 * Centered "nothing here yet" placeholder for empty lists and views.
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <Icon size={32} className="text-fg-muted mb-4 shrink-0" />
      )}
      <h3 className="text-base font-semibold text-brand-primary">{title}</h3>
      {description && <p className="text-sm text-fg-secondary mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
