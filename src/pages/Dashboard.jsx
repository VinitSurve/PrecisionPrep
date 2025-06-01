import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import DashboardStats from '../components/DashboardStats';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
        setLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        navigate('/login');
      }
    };
    
    checkUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1>Your PrecisionPrep Progress Dashboard</h1>
      <p className="welcome-message">
        Welcome back, {user?.email}! Here's your progress summary.
      </p>
      
      <DashboardStats />
    </div>
  );
};

export default Dashboard;
