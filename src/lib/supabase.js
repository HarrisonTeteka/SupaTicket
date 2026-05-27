import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    '[supabase] VITE_SUPABASE_URL is missing or empty. Add it to your .env.local file.'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    '[supabase] VITE_SUPABASE_ANON_KEY is missing or empty. Add it to your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
