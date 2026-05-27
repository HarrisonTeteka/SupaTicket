export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-app via-surface to-brand-pending/40 text-brand-primary">
      <img
        src="/supamoto-logo.svg"
        alt="SupaMoto"
        className="h-16 mb-4 animate-pulse"
      />
      <h2 className="font-semibold text-lg">{message}</h2>
    </div>
  );
}
