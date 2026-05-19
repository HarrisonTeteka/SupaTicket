import { Ticket } from 'lucide-react';

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f5f7f9] text-[#12344d]">
      <div className="w-16 h-16 bg-[#12344d] text-white rounded-2xl flex items-center justify-center mb-4 animate-pulse shadow-lg">
        <Ticket size={32} />
      </div>
      <h2 className="font-bold text-lg">{message}</h2>
    </div>
  );
}
