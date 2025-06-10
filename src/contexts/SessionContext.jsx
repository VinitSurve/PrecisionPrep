import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../supabase/client';
import { refreshSession, getSessionSilently } from '../utils/authRefresh';

// Create the context
const SessionContext = createContext();

// Custom hook to use the session context
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

// Session provider component
export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastCheckTimeRef = useRef(0);
  const checkingRef = useRef(false);
  const broadcastChannelRef = useRef(null);
  const sessionRef = useRef(null);

  // Update ref when session changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Create broadcast channel for cross-tab communication
  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel('session_sync_channel');
      
      broadcastChannelRef.current.onmessage = (event) => {
        console.log('Received session message:', event.data.type);
        if (event.data.type === 'SESSION_UPDATED' && event.data.session) {
          console.log('Updating session from broadcast');
          setSession(event.data.session);
          if (event.data.hasOnboarded !== undefined) {
            setHasOnboarded(event.data.hasOnboarded);
          }
          setLoading(false);
        } else if (event.data.type === 'SESSION_REMOVED') {
          console.log('Removing session from broadcast');
          setSession(null);
          setHasOnboarded(true);
          setLoading(false);
        }
      };
      
      return () => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close();
        }
      };
    } catch (err) {
      console.error('BroadcastChannel not supported:', err);
    }
  }, []);

  // Check user preferences 
  const checkUserPreferences = async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error checking preferences:', error);
      return null;
    }
  };

  // Check and update session
  const checkSession = async (force = false, showLoading = true) => {
    try {
      // Prevent multiple simultaneous checks
      if (checkingRef.current && !force) {
        return;
      }
      
      // Rate limit checks unless forced
      const now = Date.now();
      if (!force && now - lastCheckTimeRef.current < 3000) {
        return;
      }
      
      checkingRef.current = true;
      lastCheckTimeRef.current = now;
      
      // Only show loading if requested
      if (showLoading) {
        setLoading(true);
      }
      
      console.log("Checking session...");
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session;
      
      // If session changed
      if (currentSession?.user) {
        console.log("Valid session found");
        setSession(currentSession);
        
        // If session will expire soon, refresh it
        if (currentSession.expires_at) {
          const expiresAt = new Date(currentSession.expires_at * 1000);
          const timeUntilExpiry = expiresAt - new Date();
          
          if (timeUntilExpiry < 5 * 60 * 1000) {
            console.log("Session expiring soon, refreshing");
            setIsRefreshing(true);
            await refreshSession();
            setIsRefreshing(false);
          }
        }
        
        // Check preferences
        const preferences = await checkUserPreferences(currentSession.user.id);
        const hasPreferences = !!preferences;
        setHasOnboarded(hasPreferences);
        
        // Broadcast session update to other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'SESSION_UPDATED',
            session: currentSession,
            hasOnboarded: hasPreferences,
            timestamp: Date.now()
          });
        }
      } else {
        // No session
        console.log("No valid session");
        setSession(null);
        setHasOnboarded(true);
        
        // Broadcast session removal to other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'SESSION_REMOVED',
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
      checkingRef.current = false;
    }
  };

  // Silent session refresh for tab switching
  const silentSessionCheck = async () => {
    try {
      // Use the silent session getter first
      const { session: cachedSession, fromCache } = await getSessionSilently();
      
      if (cachedSession) {
        // Update UI immediately with the cached session
        setSession(cachedSession);
        setLoading(false);
        
        // Then only if cache was used, refresh in the background
        if (fromCache) {
          setIsRefreshing(true);
          // Small delay to ensure UI is responsive first
          setTimeout(async () => {
            await checkSession(false, false);
            setIsRefreshing(false);
          }, 300);
        }
        
        return true;
      } else {
        // No cached session, do a normal check but don't show loading right away
        setTimeout(() => {
          if (checkingRef.current) {
            // If still checking after delay, show loading indicator
            setLoading(true);
          }
        }, 300);
        
        await checkSession(true, false);
        return !!sessionRef.current;
      }
    } catch (error) {
      console.error('Error in silent session check:', error);
      return !!sessionRef.current;
    }
  };

  // Initialize session on mount and setup auth listener
  useEffect(() => {
    console.log("Setting up session context...");
    
    // Initial session check
    checkSession(true);
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log(`Auth state changed: ${event}`);
      
      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && newSession) {
        setSession(newSession);
        checkUserPreferences(newSession.user.id).then(preferences => {
          setHasOnboarded(!!preferences);
        });
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setHasOnboarded(true);
      }
    });
    
    // Check session when tab becomes visible - with improved handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking session silently');
        
        // First use current session data for immediate UI response
        if (sessionRef.current) {
          setLoading(false);
        }
        
        // Then do a silent refresh in the background
        silentSessionCheck();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Handle session refresh every 5 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && session) {
        console.log('Periodic session refresh check');
        // Use silent refresh for better UX
        setIsRefreshing(true);
        refreshSession(true).then(() => {
          setIsRefreshing(false);
        });
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [session]);
  
  const contextValue = {
    session,
    loading,
    hasOnboarded,
    isRefreshing,
    refreshSession: () => checkSession(true),
    silentRefresh: silentSessionCheck,
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setHasOnboarded(true);
    }
  };
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};