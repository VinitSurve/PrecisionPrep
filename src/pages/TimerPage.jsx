import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import Timer from '../components/Timer';

const TimerPage = () => {
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
        <div className="loading">Loading timer...</div>
      </div>
    );
  }

  return (
    <div className="timer-page-container">
      <h1>PrecisionPrep Question Timer</h1>
      <p className="timer-instructions">
        Set your target time, start the timer when you begin solving a question, 
        and stop it when you're done. The app will tell you if you were fast or slow 
        compared to your target time.
      </p>
      
      <Timer />
    </div>
  );
};

export default TimerPage;
