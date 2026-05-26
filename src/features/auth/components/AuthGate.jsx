import { useState, createContext, useContext, useMemo } from 'react';
import { Ticket, Mail, Lock, UserPlus, LogIn, User as UserIcon } from 'lucide-react';
import { useAuthSession } from '../hooks/useAuthSession';
import { useUserProfile } from '../hooks/useUserProfile';
import { signInWithEmail, signUpWithEmail } from '../services/authService';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthGate>');
  return ctx;
}

/**
 * Wraps the application. Renders the login screen when there's no session,
 * a loading splash while the profile loads, and `children` otherwise.
 *
 * Exposes { session, user, profile, isAdmin } to descendants via useAuth().
 */
export function AuthGate({ children }) {
  const { session, user, loading: authLoading } = useAuthSession();
  const { profile, loading: profileLoading, setProfile } = useUserProfile(user?.id);

  const isAdmin = profile?.role === 'admin';
  const isCustomer = profile?.role === 'customer';

  const value = useMemo(
    () => ({ session, user, profile, isAdmin, isCustomer, setProfile }),
    [session, user, profile, isAdmin, isCustomer, setProfile]
  );

  if (authLoading) return <LoadingScreen message="Authenticating workspace..." />;
  if (!session) return <AuthScreen />;
  if (profileLoading || !profile) return <LoadingScreen message="Loading your profile..." />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --------------------------------------------------------------------------
// Login / Signup screen
// --------------------------------------------------------------------------
function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isCustomer, setIsCustomer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail({ email, password });
        // onAuthStateChange will flip the gate.
      } else {
        const result = await signUpWithEmail({ email, password, name, isCustomer });
        if (!result.session) {
          // Email confirmation is on — user must confirm before signing in.
          setInfo('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f7f9] text-[#12344d] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#12344d] text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Ticket size={32} />
          </div>
          <h1 className="text-2xl font-black">SupaTicket</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your workspace account'}
          </p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1">
          <TabButton active={mode === 'signin'} onClick={() => setMode('signin')}>
            <LogIn size={14} className="inline mr-1.5" /> Sign In
          </TabButton>
          <TabButton active={mode === 'signup'} onClick={() => setMode('signup')}>
            <UserPlus size={14} className="inline mr-1.5" /> Sign Up
          </TabButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Field label="Full Name" icon={UserIcon}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                autoComplete="name"
              />
            </Field>
          )}

          <Field label="Email" icon={Mail}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
              autoComplete="email"
            />
          </Field>

          <Field label="Password" icon={Lock}>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </Field>

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isCustomer}
                onChange={(e) => setIsCustomer(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I'm a <strong>customer</strong> raising tickets (not a staff member).
              </span>
            </label>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-[#12344d] text-white rounded-xl font-bold hover:bg-[#0d273a] transition-all shadow-lg disabled:opacity-50"
          >
            {busy ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-[11px] text-center text-gray-400 leading-relaxed">
          The first account ever created becomes the admin. After that, staff
          sign-ups land in the workspace; customer sign-ups land in the portal.
        </p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
        active ? 'bg-white text-[#12344d] shadow-sm' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        {children}
      </div>
    </div>
  );
}
