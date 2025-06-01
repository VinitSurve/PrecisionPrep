import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import DashboardStats from '../components/DashboardStats';
import SubjectAnalytics from '../components/SubjectAnalytics';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Redirect to login if not authenticated
          navigate('/login');
          return;
        }
        
        setUser(user);
      } catch (error) {
        console.error('Error checking authentication:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, [navigate]);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Extract name or use email
          if (user.user_metadata && user.user_metadata.full_name) {
            setUserName(user.user_metadata.full_name);
          } else {
            // Extract a more user-friendly name from the email
            const email = user.email;
            
            // First try to get the part before @ and capitalize first letter of each word
            if (email) {
              const namePart = email.split('@')[0];
              
              // Replace dots, underscores, numbers with spaces and capitalize
              const formattedName = namePart
                .replace(/[._0-9]/g, ' ')  // Replace dots, underscores, numbers with spaces
                .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
                .trim()                     // Remove leading/trailing spaces
                .split(' ')                 // Split by space
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter
                .join(' ');
              
              setUserName(formattedName);
            } else {
              setUserName('User');  // Fallback
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    
    fetchUserInfo();
    
    // Add visibility change handler to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserInfo();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="welcome-message">
        <h1>Welcome{userName ? `, ${userName}` : ''}!</h1>
        <p>Track your progress and improve your performance.</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          Subject Analytics
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' ? (
          <DashboardStats />
        ) : (
          <SubjectAnalytics />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
