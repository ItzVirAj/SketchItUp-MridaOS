import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('your-project-id')
);

// Graceful dummy client fallback to prevent crashes if credentials are not yet set
const dummyClient = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null }),
  }),
  channel: () => ({
    on: function() { return this; },
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  removeChannel: () => {},
} as unknown as SupabaseClient;

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : dummyClient;

export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message?: string }> => {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase credentials missing in .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)',
    };
  }

  try {
    const { error } = await supabase.from('branches').select('id').limit(1);
    if (error) {
      // If table does not exist, schema needs running
      if (error.code === '42P01') {
        return {
          ok: false,
          message: 'Supabase connected! Tables not found. Please run supabase_schema.sql in your Supabase SQL Editor.',
        };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
};
