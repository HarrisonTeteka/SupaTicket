export function Badge({ children, className = '' }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}
