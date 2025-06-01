import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add better error handling and logging
const handleSupabaseError = (error) => {
  if (error.message?.includes('Failed to fetch')) {
    console.error('Network issue detected. Please check your internet connection.');
    return;
  }
  
  if (error.status === 400) {
    console.error('Bad request to Supabase API. Check your credentials and request format.');
    return;
  }

  console.error('Supabase error:', error);
};

// Implement improved singleton pattern with retry mechanism
const createSupabaseClient = () => {
  let instance = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  return () => {
    if (instance) return instance;

    try {
      // Log initialization for debugging
      console.log('Creating Supabase client with URL:', supabaseUrl);
      
      // Create the client with improved configuration
      instance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: 'precision-prep-auth',
          debug: true,
          flowType: 'pkce' // More secure flow than implicit
        },
        global: {
          fetch: (url, options) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            return fetch(url, { 
              ...options, 
              signal: controller.signal,
              credentials: 'same-origin',
              headers: {
                ...options.headers,
                'Cache-Control': 'no-cache'
              }
            })
            .then(response => {
              clearTimeout(timeoutId);
              return response;
            })
            .catch(error => {
              clearTimeout(timeoutId);
              console.error('Supabase fetch error:', error);
              
              // Add retry logic for network errors
              if (error.name === 'AbortError' || error.message?.includes('Failed to fetch')) {
                if (retryCount < MAX_RETRIES) {
                  retryCount++;
                  console.log(`Retrying fetch (${retryCount}/${MAX_RETRIES})...`);
                  // Try again with same params after a delay
                  return new Promise(resolve => {
                    setTimeout(() => resolve(fetch(url, options)), 1000);
                  });
                }
              }
              
              throw error;
            });
          }
        }
      });

      console.log('Supabase client initialized successfully');
      return instance;
      
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      handleSupabaseError(error);
      throw error;
    }
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
    if (error) {
      handleSupabaseError(error);
      return null;
    }
    return data.user;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

// Add a reconnection function with improved retry logic
export const reconnectSupabase = async () => {
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`Attempting to reconnect Supabase (attempt ${i+1}/3)...`);
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        handleSupabaseError(error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      console.log('Supabase reconnected successfully');
      return data?.session || null;
      
    } catch (error) {
      handleSupabaseError(error);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  console.error('Failed to reconnect Supabase after multiple attempts');
  return null;
};

// Add this function to test connectivity
export const testSupabaseConnection = async () => {
  try {
    // Simple query to test connectivity
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('exam_subjects')
      .select('count(*)', { count: 'exact' })
      .limit(1);
      
    const endTime = Date.now();
    
    if (error) {
      handleSupabaseError(error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error
      };
    }
    
    return {
      success: true,
      message: `Connection successful (${endTime - startTime}ms)`,
      data
    };
  } catch (error) {
    handleSupabaseError(error);
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      error
    };
  }
};
