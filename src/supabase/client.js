import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Implement true singleton pattern with closure
const createSupabaseClient = () => {
  let instance = null;

  return () => {
    if (instance) return instance;

    instance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Use a consistent storage key
        storageKey: 'precision-prep-auth'
      }
    });

    console.log('Supabase client initialized');
    return instance;
  };
};

// Create a getter function
const getSupabase = createSupabaseClient();

// Export a single Supabase instance
export const supabase = getSupabase();

// Helper functions for common auth operations
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const checkUserPreferences = async userId => {
  try {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error checking user preferences:', error);
    return null;
  }
};
