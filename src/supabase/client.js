import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
// Provide fallback values to prevent URL construction errors during development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create a single supabase client for interacting with your database
let supabase;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  // Create a mock client for development if there's an error
  // This allows the app to load without crashing, though Supabase features won't work
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ subscription: { unsubscribe: () => {} } }),
      signInWithPassword: () => Promise.resolve({ error: { message: 'Supabase not properly configured' } }),
      signUp: () => Promise.resolve({ error: { message: 'Supabase not properly configured' } }),
      signOut: () => Promise.resolve({})
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        })
      }),
      insert: () => Promise.resolve({ error: { message: 'Supabase not properly configured' } })
    })
  };
}

export { supabase };

// Display a warning in the console if using placeholder values
if (supabaseUrl === 'https://placeholder-project.supabase.co') {
  console.warn(
    'You are using placeholder Supabase credentials. Please update your .env file with actual Supabase URL and anon key.'
  );
}
