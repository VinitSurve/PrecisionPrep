import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import SubjectTimer from './components/SubjectTimer';
import { SessionProvider, useSession } from './contexts/SessionContext';
import './styles/Loader.css'; // Make sure to create this file with the CSS provided

// Main App component
function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

// App content using the session context
function AppContent() {
  const { session, loading, hasOnboarded, isRefreshing } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isReturningFromTab, setIsReturningFromTab] = useState(false);
  
  // Keep track if we're coming back from another tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsReturningFromTab(true);
        // Reset after a short delay
        setTimeout(() => setIsReturningFromTab(false), 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Improved Protected Route component 
  const ProtectedRoute = ({ children, requiresOnboarding = true }) => {
    // Show loading only if not returning from tab switch
    if (loading && !isReturningFromTab) {
      return (
        <div className="loading-container">
          <div className="loading">Loading...</div>
        </div>
      );
    }
    
    // If returning from tab, assume session is still valid temporarily
    if (isReturningFromTab && session) {
      // Just render children and let session check happen in background
      return children;
    }
    
    // Redirect to login if no session
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    
    // Handle redirection states to prevent UI flicker
    if (isRedirecting) {
      return children;
    }
    
    // Handle onboarding redirection if needed
    if (requiresOnboarding && !hasOnboarded) {
      setIsRedirecting(true);
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
            <Route 
              path="/" 
              element={
                <Navigate 
                  to={session ? (hasOnboarded ? "/dashboard" : "/onboarding") : "/login"} 
                  replace 
                />
              } 
            />
          </Routes>
        </main>
        
        {/* Show footer on all routes except onboarding */}
        {window.location.pathname !== '/onboarding' && (
          <footer className="app-footer">
            <p style={{ color: 'white' }}> @{new Date().getFullYear()} PrecisionPrep | A Progressive Web App</p>
          </footer>
        )}
        
        {/* Subtle loading indicator for tab switching */}
        {(isReturningFromTab || isRefreshing) && (
          <div className="tab-return-indicator">
            <span className="dot-pulse"></span>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;