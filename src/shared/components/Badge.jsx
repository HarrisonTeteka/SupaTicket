export function Badge({ children, className = '' }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}
