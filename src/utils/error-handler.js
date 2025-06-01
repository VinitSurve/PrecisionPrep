/**
 * Format Supabase errors for display
 * @param {Object} error - Error object from Supabase
 * @param {string} defaultMessage - Default error message
 * @returns {string} - Formatted error message
 */
export const formatSupabaseError = (error, defaultMessage = 'An error occurred') => {
  if (!error) return defaultMessage;
  
  // Check if it's a Supabase error with code and message
  if (error.code) {
    switch (error.code) {
      case '42501':
        return 'Permission denied. You don\'t have access to this resource.';
      case 'PGRST116':
        return 'Resource not found.';
      case '23505':
        return 'A record with this information already exists.';
      case '42P01':
        return 'Database table not found.';
      case 'P0001':
        return error.message || 'Database operation failed.';
      default:
        return `${error.message || defaultMessage} (code: ${error.code})`;
    }
  }
  
  // Return the error message or default
  return error.message || defaultMessage;
};

/**
 * Log error details to console
 * @param {string} context - Context where the error occurred
 * @param {Object} error - Error object
 */
export const logError = (context, error) => {
  console.error(`[${context}] Error:`, error);
  
  // Add additional context if available
  if (error?.status) {
    console.error(`Status: ${error.status}`);
  }
  
  if (error?.code) {
    console.error(`Error code: ${error.code}`);
  }
};

/**
 * Handle Supabase errors and return formatted message
 * @param {Object} error - Error object from Supabase
 * @param {string} context - Context where the error occurred
 * @param {string} defaultMessage - Default error message
 * @returns {string} - Formatted error message
 */
export const handleSupabaseError = (error, context, defaultMessage) => {
  logError(context, error);
  return formatSupabaseError(error, defaultMessage);
};
