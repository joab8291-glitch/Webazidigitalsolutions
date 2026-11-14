import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT') && !anonKey.includes('YOUR_SUPABASE'));
export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export async function requireAgencyAdmin(userId: string) {
  if (!supabase) return false;
  const { data, error } = await supabase.from('agency_admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  return !error && Boolean(data);
}