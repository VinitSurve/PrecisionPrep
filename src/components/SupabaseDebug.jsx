import { useState } from 'react';
import { supabase, testRLSPermissions } from '../supabase/client';

const SupabaseDebug = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const checkAuthStatus = async () => {
    setLoading(true);
    addLog('Checking authentication status...', 'info');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        addLog(`✅ Authenticated as: ${user.email} (${user.id})`, 'success');
      } else {
        addLog('❌ Not authenticated', 'error');
      }
    } catch (error) {
      addLog(`❌ Error checking auth: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };
  
  const checkSession = async () => {
    setLoading(true);
    addLog('Checking session...', 'info');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (data?.session) {
        addLog(`✅ Active session found: ${data.session.user.email}`, 'success');
        addLog(`Session expires at: ${new Date(data.session.expires_at * 1000).toLocaleString()}`, 'info');
      } else {
        addLog('❌ No active session', 'error');
      }
    } catch (error) {
      addLog(`❌ Error checking session: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };
  
  const refreshSession = async () => {
    setLoading(true);
    addLog('Refreshing session...', 'info');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (data?.session) {
        addLog('✅ Session refreshed successfully', 'success');
      } else {
        addLog('❌ No session available to refresh', 'error');
      }
    } catch (error) {
      addLog(`❌ Error refreshing session: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };
  
  const checkRLSPermissions = async () => {
    setLoading(true);
    addLog('Testing RLS permissions...', 'info');
    
    try {
      const result = await testRLSPermissions();
      
      if (result) {
        addLog('✅ RLS permissions test passed', 'success');
      } else {
        addLog('❌ RLS permissions test failed', 'error');
      }
    } catch (error) {
      addLog(`❌ Error testing RLS permissions: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };
  
  return (
    <div className="debug-panel">
      <h2>Supabase Debug Panel</h2>
      
      <div className="debug-actions">
        <button 
          onClick={checkAuthStatus} 
          disabled={loading}
          className="debug-button"
        >
          Check Auth
        </button>
        <button 
          onClick={checkSession} 
          disabled={loading}
          className="debug-button"
        >
          Check Session
        </button>
        <button 
          onClick={refreshSession} 
          disabled={loading}
          className="debug-button"
        >
          Refresh Session
        </button>
        <button 
          onClick={checkRLSPermissions} 
          disabled={loading}
          className="debug-button"
        >
          Test RLS
        </button>
        <button 
          onClick={clearLogs} 
          disabled={loading}
          className="debug-button clear"
        >
          Clear Logs
        </button>
      </div>
      
      <div className="debug-logs">
        {logs.map((log, index) => (
          <div key={index} className={`log-entry ${log.type}`}>
            <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
        
        {logs.length === 0 && (
          <p className="no-logs">No logs yet. Use the buttons above to debug Supabase connection.</p>
        )}
      </div>
    </div>
  );
};

export default SupabaseDebug;
