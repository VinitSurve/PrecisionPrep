import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/client';
import { refreshSession } from '../utils/authRefresh';

export default function SessionManager() {
  const [hasSession, setHasSession] = useState(false);
  const hasSessionRef = useRef(hasSession); // Add a ref to track state without re-renders
  const broadcastChannelRef = useRef(null);
  const visibilityTimeoutRef = useRef(null);
  const checkLockRef = useRef(false);

  // Update ref when state changes
  useEffect(() => {
    hasSessionRef.current = hasSession;
  }, [hasSession]);

  // Handle auth session between tabs
  useEffect(() => {
    // Create a channel for cross-tab communication 
    try {
      broadcastChannelRef.current = new BroadcastChannel('auth_state_channel');
      
      broadcastChannelRef.current.onmessage = async (event) => {
        console.log('Received auth message from another tab:', event.data.type);
        
        if (event.data.type === 'SESSION_UPDATED') {
          // Only update if different from current state
          if (!hasSessionRef.current) {
            setHasSession(true);
          }
        } else if (event.data.type === 'SESSION_EXPIRED' || event.data.type === 'SIGNED_OUT') {
          // Only update if different from current state
          if (hasSessionRef.current) {
            setHasSession(false);
          
            // Hard refresh the page if we're on a protected route
            const currentPath = window.location.pathname;
            const publicRoutes = ['/login', '/signup'];
            
            if (!publicRoutes.includes(currentPath)) {
              window.location.href = '/login';
            }
          }
        }
      };
    } catch (err) {
      console.error('BroadcastChannel not supported:', err);
    }

    // Check initial session    
    const checkSession = async () => {
      try {
        if (checkLockRef.current) return;
        checkLockRef.current = true;
        
        const { data } = await supabase.auth.getSession();
        const hasValidSession = !!data?.session;
        
        // Only update state if changed
        if (hasValidSession !== hasSessionRef.current) {
          setHasSession(hasValidSession);
        }
        
        if (hasValidSession) {
          console.log('Valid session found on initial check');
          
          // If session is valid but will expire soon, refresh it
          const expiresAt = new Date(data.session.expires_at * 1000);
          const now = new Date();
          const timeUntilExpiry = expiresAt - now;
          
          // If less than 5 minutes until expiry, refresh
          if (timeUntilExpiry < 5 * 60 * 1000) {
            await refreshSession();
          }
        }
        
        checkLockRef.current = false;
      } catch (err) {
        console.error('Error checking session:', err);
        checkLockRef.current = false;
      }
    };
    
    checkSession();
    
    // Handle tab visibility changes with debouncing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any pending timeout
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        
        // Set a small delay to avoid multiple rapid checks
        visibilityTimeoutRef.current = setTimeout(async () => {
          console.log('Tab became visible, refreshing session if needed');
          
          if (checkLockRef.current) return;
          checkLockRef.current = true;
          
          try {
            // Get current session first
            const { data } = await supabase.auth.getSession();
            const hasValidSession = !!data?.session;
            
            // Only process if session status changed
            if (hasValidSession !== hasSessionRef.current) {
              setHasSession(hasValidSession);
              
              if (hasValidSession) {
                const success = await refreshSession();
                
                if (success && broadcastChannelRef.current) {
                  broadcastChannelRef.current.postMessage({ 
                    type: 'SESSION_UPDATED',
                    timestamp: Date.now()
                  });
                }
              } else if (broadcastChannelRef.current) {
                // No valid session found, notify other tabs
                broadcastChannelRef.current.postMessage({ 
                  type: 'SESSION_EXPIRED',
                  timestamp: Date.now() 
                });
              }
            }
          } catch (err) {
            console.error('Error during visibility session refresh:', err);
          } finally {
            checkLockRef.current = false;
          }
        }, 500); // Increase debounce timeout
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for auth state changes using onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      const newHasSession = !!session;
      // Only update state if different
      if (newHasSession !== hasSessionRef.current) {
        setHasSession(newHasSession);
      }
      
      // Broadcast state changes to other tabs
      if (broadcastChannelRef.current) {
        if (['SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
          broadcastChannelRef.current.postMessage({ 
            type: 'SESSION_UPDATED',
            timestamp: Date.now()
          });
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          broadcastChannelRef.current.postMessage({ 
            type: 'SIGNED_OUT',
            timestamp: Date.now()
          });
        }
      }
    });
    
    return () => {
      // Clean up all listeners and timeouts
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      
      subscription?.unsubscribe();
      
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []); // Empty dependency array
  
  return null; // This component doesn't render anything
}