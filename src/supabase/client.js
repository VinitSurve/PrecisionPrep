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
        storageKey: 'precision-prep-auth',
        // Add retry and timeout config
        flowType: 'implicit',
        debug: true
      },
      // Add global error handler
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          return fetch(url, { ...options, signal: controller.signal })
            .then(response => {
              clearTimeout(timeoutId);
              return response;
            })
            .catch(error => {
              clearTimeout(timeoutId);
              console.error('Supabase fetch error:', error);
              throw error;
            });
        }
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

// Add a reconnection function
export const reconnectSupabase = async () => {
  try {
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data?.session || null;
  } catch (error) {
    console.error('Failed to reconnect Supabase:', error);
    return null;
  }
};
