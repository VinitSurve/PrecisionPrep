import { supabase } from '../supabase/client';

/**
 * Helper function to get the current authenticated user
 * @returns {Promise<Object|null>} The current user or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
};

/**
 * Check if the user has completed onboarding
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} True if user has completed onboarding
 */
export const hasCompletedOnboarding = async (userId) => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking onboarding status:', error);
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in hasCompletedOnboarding:', error);
    return false;
  }
};

/**
 * Handle page transition flags for smoother navigation
 * @param {string} flag - Flag name to set
 * @param {boolean} [value=true] - Flag value
 */
export const setTransitionFlag = (flag, value = true) => {
  if (value) {
    localStorage.setItem(flag, 'true');
    // Dispatch event for listeners
    window.dispatchEvent(new StorageEvent('storage', {
      key: flag,
      newValue: 'true'
    }));
  } else {
    localStorage.removeItem(flag);
  }
};

/**
 * Clean up all auth flags
 */
export const cleanupAuthFlags = () => {
  localStorage.removeItem('auth_user_id');
  localStorage.removeItem('onboarding_in_progress');
  localStorage.removeItem('onboarding_completed');
  localStorage.removeItem('signup_completed');
};
