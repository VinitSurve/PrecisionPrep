import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase/client';

// Components
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding'; // Import the new Onboarding component
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
  const [isRedirecting, setIsRedirecting] = useState(false); // Track page transitions

  useEffect(() => {
    const handleVisibilityChange = () => {
      // When returning to visible state, refresh auth state if needed
      if (document.visibilityState === 'visible' && loading) {
        // Reset loading state to trigger a re-render
        setLoading(false);
        
        // Re-check auth state when tab becomes visible again
        const checkAuthState = async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const currentSession = data?.session;
            setSession(currentSession);
            
            // Only check preferences if we have a session
            if (currentSession?.user) {
              const preferences = await checkUserPreferences(currentSession.user.id);
              setHasOnboarded(!!preferences);
            }
          } catch (error) {
            console.error('Error refreshing auth state:', error);
          } 
        };
        
        checkAuthState();
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Existing code for handleOnboardingComplete and other listeners
    const handleOnboardingComplete = (e) => {
      if (e.key === 'onboarding_completed' && e.newValue === 'true') {
        setHasOnboarded(true);
        localStorage.removeItem('onboarding_completed');
      }
    };

    window.addEventListener('storage', handleOnboardingComplete);

    // Get initial session - simplified to prevent repeated calls
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session;
        setSession(currentSession);
        
        // Only check preferences if we have a session
        if (currentSession?.user) {
          const preferences = await checkUserPreferences(currentSession.user.id);
          setHasOnboarded(!!preferences);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth listener with optimization to prevent unnecessary checks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Only update if the session actually changed
        if (JSON.stringify(newSession) !== JSON.stringify(session)) {
          setSession(newSession);
          
          // Only check preferences on relevant auth events
          if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && newSession?.user) {
            const preferences = await checkUserPreferences(newSession.user.id);
            setHasOnboarded(!!preferences);
          } else if (event === 'SIGNED_OUT') {
            setHasOnboarded(true); // Reset to default
          }
        }
      }
    );

    // Clean up all event listeners
    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleOnboardingComplete);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading]); // Add loading as a dependency

  // Protected route component with improved navigation handling
  const ProtectedRoute = ({ children, requiresOnboarding = true }) => {
    if (loading) return <div className="loading-container">Loading...</div>;
    
    if (!session) return <Navigate to="/login" replace />;
    
    if (isRedirecting) {
      return children; // Let the current route render while redirecting to avoid flickering
    }
    
    // If we need onboarding and user hasn't onboarded, redirect
    if (requiresOnboarding && !hasOnboarded) {
      setIsRedirecting(true);
      // Use setTimeout to ensure smooth transition
      setTimeout(() => setIsRedirecting(false), 100);
      return <Navigate to="/onboarding" replace />;
    }
    
    return children;
  };

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
