import { useState } from 'react';
import { User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from './AuthGate';
import { signOut } from '../services/authService';
import { EditProfileModal } from '../../admin/components/EditProfileModal';

/**
 * Sidebar avatar + popover menu. Lives at the bottom of the dark sidebar;
 * the popover opens upward to the right so it doesn't fall off the viewport.
 * "Edit Profile" opens the shared EditProfileModal in self mode.
 */
export function ProfileMenu() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!profile) return null;

  const initial = profile.name?.charAt(0).toUpperCase() || '?';

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Sign out failed:', err);
    }
  };

  return (
    <div className="relative w-full flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-brand-accent border-2 border-white/20 flex items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-105 shadow-md"
        title={profile.name}
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-full bottom-0 ml-4 w-56 bg-surface rounded-xl shadow-xl border border-line p-2 flex flex-col z-50">
            <div className="px-3 py-2 border-b border-line mb-2">
              <p className="text-sm font-bold text-fg truncate">{profile.name}</p>
              <p className="text-[10px] text-fg-muted truncate">{profile.email}</p>
              <p className="text-[10px] text-brand-accent font-bold uppercase tracking-wider mt-1">
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex flex-col z-50">
            <div className="px-3 py-2 border-b border-gray-100 mb-2">
              <p className="text-sm font-bold text-gray-800 truncate">{profile.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{profile.email}</p>
              <p className="text-[10px] text-[#F58202] font-bold uppercase tracking-wider mt-1">
                {profile.role}
              </p>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                setEditing(true);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-brand-accent/10 hover:text-brand-accent rounded-lg transition-colors font-semibold text-left mb-1"
            >
              <UserIcon size={16} /> Edit Profile
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold text-left"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </>
      )}

      {editing && (
        <EditProfileModal
          mode="self"
          profile={profile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
