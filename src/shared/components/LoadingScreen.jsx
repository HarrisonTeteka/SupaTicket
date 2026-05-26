export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f5f7f9] via-white to-[#F9EDCC]/40 text-[#336021]">
      <img
        src="/supamoto-logo.svg"
        alt="SupaMoto"
        className="h-16 mb-4 animate-pulse drop-shadow-sm"
      />
      <h2 className="font-bold text-lg">{message}</h2>
    </div>
  );
}
