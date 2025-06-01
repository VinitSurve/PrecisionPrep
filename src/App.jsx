import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase/client';

// Components
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import SubjectTimer from './components/SubjectTimer';

// Helper function since it's referenced but missing
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

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(true); 
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authTimeoutExceeded, setAuthTimeoutExceeded] = useState(false); // New state

  useEffect(() => {
    // Set up visibility change handler first
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Re-check auth state when tab becomes visible again
        try {
          const { data } = await supabase.auth.getSession();
          setSession(data?.session);
          
          // Check preferences if session exists
          if (data?.session?.user) {
            const preferences = await checkUserPreferences(data.session.user.id);
            setHasOnboarded(!!preferences);
          }
        } catch (error) {
          console.error('Error refreshing auth state:', error);
        }
      }
    };

    // Set up auth state listener immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
          
        // Check preferences on relevant auth events
        if (newSession?.user) {
          try {
            const preferences = await checkUserPreferences(newSession.user.id);
            setHasOnboarded(!!preferences);
          } catch (err) {
            console.error('Error checking preferences:', err);
          }
        } else if (event === 'SIGNED_OUT') {
          setHasOnboarded(true); // Reset to default
        }
        
        // Auth check is complete regardless of result
        setAuthChecked(true);
        setLoading(false);
      }
    );

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up onboarding completion listener
    const handleOnboardingComplete = (e) => {
      if (e.key === 'onboarding_completed' && e.newValue === 'true') {
        setHasOnboarded(true);
        localStorage.removeItem('onboarding_completed');
      }
    };
    window.addEventListener('storage', handleOnboardingComplete);

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data?.session);
        
        // Check preferences if session exists
        if (data?.session?.user) {
          const preferences = await checkUserPreferences(data.session.user.id);
          setHasOnboarded(!!preferences);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        // Always mark auth as checked and loading complete
        setAuthChecked(true);
        setLoading(false);
      }
    };

    // Set a short timeout to ensure loading state doesn't get stuck
    const timeoutId = setTimeout(() => {
      if (!authChecked) {
        console.log('Auth check timeout - forcing completion');
        setAuthChecked(true);
        setLoading(false);
        setAuthTimeoutExceeded(true); // Set the flag that we hit the timeout
      }
    }, 2000); // Reduced to 2 seconds for better UX

    getInitialSession();

    // Set a longer backup timeout in case the auth system is totally frozen
    const emergencyTimeoutId = setTimeout(() => {
      if (loading) {
        console.log('Emergency timeout - forcing app to load');
        setLoading(false);
        setAuthChecked(true);
        setAuthTimeoutExceeded(true);
      }
    }, 5000); // Ultimate fallback at 5 seconds

    // Clean up all event listeners and timeouts
    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleOnboardingComplete);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
      clearTimeout(emergencyTimeoutId);
    };
  }, []); // No dependencies to prevent unnecessary reruns

  // Modified ProtectedRoute component with improved loading state handling
  const ProtectedRoute = ({ children, requiresOnboarding = true }) => {
    // Only show loading state if initial auth check hasn't completed AND we haven't exceeded the timeout
    if (loading && !authChecked && !authTimeoutExceeded) {
      return (
        <div className="loading-container">
          <div className="loading">Loading...</div>
        </div>
      );
    }
    
    // If auth timed out but we have no session, redirect to login
    if (authTimeoutExceeded && !session) {
      return <Navigate to="/login" replace />;
    }
    
    // Regular auth check
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    
    if (isRedirecting) {
      return children;
    }
    
    // If we need onboarding and user hasn't onboarded, redirect
    if (requiresOnboarding && !hasOnboarded) {
      setIsRedirecting(true);
      setTimeout(() => setIsRedirecting(false), 100);
      return <Navigate to="/onboarding" replace />;
    }
    
    return children;
  };

  // Show loading only briefly, then proceed to render the app
  if (loading && !authChecked && !authTimeoutExceeded) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading">Loading app...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {/* Show navbar on all routes except onboarding */}
        {window.location.pathname !== '/onboarding' && <Navbar />}
        
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subject-timer" 
              element={
                <ProtectedRoute>
                  <SubjectTimer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/onboarding"
              element={
                <ProtectedRoute requiresOnboarding={false}>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to={session ? (hasOnboarded ? "/dashboard" : "/onboarding") : "/login"} />} />
          </Routes>
        </main>
        
        {/* Show footer on all routes except onboarding */}
        {window.location.pathname !== '/onboarding' && (
          <footer className="app-footer">
            <p style={{ color: 'white' }}> @{new Date().getFullYear()} PrecisionPrep | A Progressive Web App</p>
          </footer>
        )}
      </div>
    </Router>
  );
}

export default App;
