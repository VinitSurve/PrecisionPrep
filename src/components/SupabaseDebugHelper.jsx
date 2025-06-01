import { useState } from 'react';
import { supabase } from '../supabase/client';

const SupabaseDebugHelper = () => {
  const [logs, setLogs] = useState([]);
  
  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };
  
  const checkAuthState = async () => {
    addLog('Checking authentication state...', 'info');
    
    try {
      // Check for current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        addLog(`Session error: ${sessionError.message}`, 'error');
        return;
      }
      
      if (!session) {
        addLog('No active session found', 'warning');
      } else {
        addLog(`Active session found for user: ${session.user.email}`, 'success');
        addLog(`User ID: ${session.user.id}`, 'info');
        addLog(`Session expires: ${new Date(session.expires_at * 1000).toLocaleString()}`, 'info');
      }
      
      // Check local storage
      const localStorageUserId = localStorage.getItem('auth_user_id');
      
      if (localStorageUserId) {
        addLog(`Found stored user ID: ${localStorageUserId}`, 'info');
      } else {
        addLog('No user ID found in localStorage', 'info');
      }
      
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    }
  };
  
  const clearLocalStorage = () => {
    localStorage.removeItem('auth_user_id');
    addLog('Cleared auth_user_id from localStorage', 'info');
  };
  
  const refreshSession = async () => {
    addLog('Attempting to refresh session...', 'info');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        addLog(`Refresh error: ${error.message}`, 'error');
        return;
      }
      
      if (data.session) {
        addLog('Session refreshed successfully', 'success');
      } else {
        addLog('No session available to refresh', 'warning');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    }
  };
  
  const signOut = async () => {
    addLog('Signing out...', 'info');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        addLog(`Sign out error: ${error.message}`, 'error');
        return;
      }
      
      addLog('Signed out successfully', 'success');
      clearLocalStorage();
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    }
  };
  
  return (
    <div className="debug-helper">
      <h3>Supabase Auth Debug</h3>
      
      <div className="debug-actions">
        <button onClick={checkAuthState} className="debug-button">Check Auth</button>
        <button onClick={refreshSession} className="debug-button">Refresh Session</button>
        <button onClick={clearLocalStorage} className="debug-button">Clear Storage</button>
        <button onClick={signOut} className="debug-button">Sign Out</button>
      </div>
      
      <div className="debug-logs">
        {logs.length === 0 && <p className="empty-logs">No logs yet</p>}
        {logs.map((log, index) => (
          <div key={index} className={`log-entry ${log.type}`}>
            <span className="log-time">{log.time}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => setLogs([])} 
        className="debug-button clear"
        disabled={logs.length === 0}
      >
        Clear Logs
      </button>
    </div>
  );
};

export default SupabaseDebugHelper;
