import { supabase } from "../supabase/client";

// Global refresh state management
let isRefreshing = false;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 10000; // 10 seconds
let lastKnownSession = null;

export const refreshSession = async (silentMode = false) => {
  try {
    // For silent mode, use cached session if available and not too old
    if (silentMode && lastKnownSession) {
      const sessionAge = Date.now() - lastRefreshTime;
      if (sessionAge < 5 * 60 * 1000) { // If session is less than 5 minutes old
        return { success: true, session: lastKnownSession, fromCache: true };
      }
    }
    
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) {
      console.log("Session refresh already in progress, skipping");
      return { success: true, session: lastKnownSession, fromCache: true };
    }
    
    // Don't refresh too frequently unless in silent mode
    const now = Date.now();
    if (!silentMode && now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log("Session refresh attempted too soon, skipping");
      return { success: true, session: lastKnownSession, fromCache: true };
    }
    
    isRefreshing = true;
    if (!silentMode) {
      console.log("Attempting session refresh...");
    }
    
    // Get current session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.log("No session to refresh");
      isRefreshing = false;
      return { success: false, session: null, fromCache: false };
    }
    
    // Check if refresh is needed by looking at expiration time
    if (sessionData.session.expires_at) {
      const expiresAt = new Date(sessionData.session.expires_at * 1000);
      const timeUntilExpiry = expiresAt - now;
      
      // If not expiring soon and in silent mode, just return current session
      if (silentMode && timeUntilExpiry > 10 * 60 * 1000) { // More than 10 minutes left
        lastKnownSession = sessionData.session;
        lastRefreshTime = now;
        isRefreshing = false;
        return { success: true, session: sessionData.session, fromCache: false };
      }
    }
    
    // Execute refresh
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Session refresh error:", error.message);
      isRefreshing = false;
      return { success: false, session: null, fromCache: false };
    }
    
    lastRefreshTime = now;
    lastKnownSession = data.session;
    if (!silentMode) {
      console.log("Session refreshed successfully");
    }
    isRefreshing = false;
    
    // Broadcast refresh to other tabs if supported and not in silent mode
    if (!silentMode) {
      try {
        const channel = new BroadcastChannel('session_sync_channel');
        channel.postMessage({
          type: 'SESSION_UPDATED',
          session: data.session,
          timestamp: now
        });
        channel.close();
      } catch (err) {
        // Ignore broadcast errors
      }
    }
    
    return { success: true, session: data.session, fromCache: false };
  } catch (err) {
    console.error("Session refresh exception:", err);
    isRefreshing = false;
    return { success: false, session: null, fromCache: false };
  }
};

// New function to get session without visible loading state
export const getSessionSilently = async () => {
  // First try to get from cache
  if (lastKnownSession) {
    const sessionAge = Date.now() - lastRefreshTime;
    if (sessionAge < 5 * 60 * 1000) { // If session is less than 5 minutes old
      return { session: lastKnownSession, fromCache: true };
    }
  }
  
  // Otherwise get from Supabase but don't refresh
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    lastKnownSession = data.session;
    lastRefreshTime = Date.now();
  }
  return { session: data?.session || null, fromCache: false };
};