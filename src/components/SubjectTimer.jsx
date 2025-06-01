import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';
import '../styles/SubjectTimer.css';
import TabSwitchAlert from './TabSwitchAlert'; // We'll create this component

const SubjectTimer = () => {
  // User and subjects state
  const [userId, setUserId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(2);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [preferredTime, setPreferredTime] = useState(120); // Default 2 minutes
  const [result, setResult] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSavingPreference, setSavingPreference] = useState(false);
  
  // Tab switching state
  const [showTabSwitchAlert, setShowTabSwitchAlert] = useState(false);
  const [tabSwitchDetected, setTabSwitchDetected] = useState(false);
  
  // Original page title
  const originalTitle = useRef('PrecisionPrep');
  
  // Refs
  const timer = useRef(null);
  const audioRef = useRef(null);
  const currentSubjectNameRef = useRef('');

  // Get current user and fetch subjects on component mount
  useEffect(() => {
    // Store original title
    originalTitle.current = document.title;
    
    const fetchUserAndSubjects = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          setError('No authenticated user found.');
          setLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        // Fetch active subjects for current user
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('name');
        
        if (subjectsError) throw subjectsError;
        
        if (subjectsData && subjectsData.length > 0) {
          setSubjects(subjectsData);
          
          // Select first subject by default
          const firstSubject = subjectsData[0];
          setCurrentSubjectId(firstSubject.id);
          currentSubjectNameRef.current = firstSubject.name;
          
          // Set timer preferences from the subject
          updateTimerFromSubject(firstSubject);
        } else {
          setError('No subjects found. Please add subjects in Settings.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load subjects.');
        setLoading(false);
      }
    };
    
    fetchUserAndSubjects();
    
    // Clean up function
    return () => {
      clearInterval(timer.current);
      
      // Reset title when unmounting
      document.title = originalTitle.current;
    };
  }, []);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Only take action if timer is running
      if (isRunning && document.visibilityState === 'hidden') {
        // Stop timer
        clearInterval(timer.current);
        setIsRunning(false);
        
        // Update title to indicate timer stopped
        document.title = "⛔ Timer stopped - Tab switched!";
        
        // Show tab switch alert on return
        setTabSwitchDetected(true);
        
        // Optional: Log the event to Supabase
        if (userId && currentSubjectId) {
          try {
            await supabase.from('events').insert({
              user_id: userId,
              subject_id: currentSubjectId,
              type: 'tab_switch_stop',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Failed to log tab switch event:', error);
          }
        }
      } else if (document.visibilityState === 'visible' && tabSwitchDetected) {
        // When returning to the tab, show the alert
        setShowTabSwitchAlert(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, userId, currentSubjectId, tabSwitchDetected]);

  // Add beforeunload event listener when timer is running
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = "Timer is running. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    if (isRunning) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRunning]);

  // Update page title based on timer state
  useEffect(() => {
    if (isRunning && currentSubjectNameRef.current) {
      document.title = `⏳ Studying... ${currentSubjectNameRef.current}`;
    } else if (tabSwitchDetected) {
      document.title = "⛔ Timer stopped - Tab switched!";
    } else if (result) {
      document.title = "✅ Session Completed";
    } else {
      document.title = originalTitle.current;
    }
    
    // Reset tab switch detected if timer starts again
    if (isRunning) {
      setTabSwitchDetected(false);
    }
  }, [isRunning, result, tabSwitchDetected]);

  // Update timer values from subject
  const updateTimerFromSubject = (subject) => {
    // Get timer minutes and seconds from subject, using defaults if not set
    const minutes = subject.timer_minutes !== null ? subject.timer_minutes : 2;
    const seconds = subject.timer_seconds !== null ? subject.timer_seconds : 0;
    
    // Update state
    setTimerMinutes(minutes);
    setTimerSeconds(seconds);
    
    // Calculate total time in seconds
    const totalSeconds = (minutes * 60) + seconds;
    setPreferredTime(totalSeconds);
  };

  // Handle subject change
  const handleSubjectChange = (e) => {
    const newSubjectId = e.target.value;
    setCurrentSubjectId(newSubjectId);
    
    // Find the selected subject
    const selectedSubject = subjects.find(s => s.id === newSubjectId);
    if (selectedSubject) {
      updateTimerFromSubject(selectedSubject);
      currentSubjectNameRef.current = selectedSubject.name;
    }
    
    // Reset timer and state
    clearInterval(timer.current);
    setIsRunning(false);
    setTime(0);
    setResult(null);
  };

  // Handle timer minutes change
  const handleMinutesChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setTimerMinutes(value);
    updatePreferredTime(value, timerSeconds);
  };

  // Handle timer seconds change
  const handleSecondsChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setTimerSeconds(value);
    updatePreferredTime(timerMinutes, value);
  };

  // Update preferred time from minutes and seconds
  const updatePreferredTime = (minutes, seconds) => {
    const totalSeconds = (minutes * 60) + seconds;
    setPreferredTime(totalSeconds);
  };

  // Save timer preference for current subject
  const saveTimerPreference = async () => {
    if (!currentSubjectId) return;
    
    try {
      setSavingPreference(true);
      
      const { error } = await supabase
        .from('subjects')
        .update({
          timer_minutes: timerMinutes,
          timer_seconds: timerSeconds
        })
        .eq('id', currentSubjectId);
      
      if (error) throw error;
      
      // Update subjects array with new timer values
      setSubjects(subjects.map(subject => 
        subject.id === currentSubjectId 
          ? { ...subject, timer_minutes: timerMinutes, timer_seconds: timerSeconds } 
          : subject
      ));
      
      setSuccess('Timer preference saved!');
      setTimeout(() => setSuccess(null), 2000);
      
    } catch (err) {
      console.error('Error saving timer preference:', err);
      setError(err.message || 'Failed to save timer preference.');
    } finally {
      setSavingPreference(false);
    }
  };

  // Start timer
  const startTimer = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResult(null);
    setTabSwitchDetected(false);
    
    timer.current = setInterval(() => {
      setTime(prevTime => prevTime + 1);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    clearInterval(timer.current);
    setIsRunning(false);
  };

  // Reset timer
  const resetTimer = () => {
    clearInterval(timer.current);
    setIsRunning(false);
    setTime(0);
    setResult(null);
    setTabSwitchDetected(false);
    document.title = originalTitle.current;
  };

  // Handle tab switch alert close
  const handleTabSwitchAlertClose = () => {
    setShowTabSwitchAlert(false);
    document.title = originalTitle.current;
    setTabSwitchDetected(false);
  };

  // Record result (correct/incorrect)
  const recordResult = async (wasCorrect) => {
    if (!userId || !currentSubjectId || time === 0) return;
    
    try {
      // Determine speed (fast/slow based on preferred time)
      const speed = time <= preferredTime ? 'fast' : 'slow';
      
      // Create session record
      const sessionData = {
        user_id: userId,
        subject_id: currentSubjectId,
        time_taken: time,
        was_correct: wasCorrect,
        preferred_time: preferredTime,
        speed: speed
      };
      
      // Insert session into database
      const { error } = await supabase
        .from('sessions')
        .insert([sessionData]);
      
      if (error) throw error;
      
      // Show result
      setResult({
        wasCorrect,
        time,
        speed
      });
      
      // Reset timer
      setTime(0);
      
      // Show success message
      setSuccess('Session recorded! View your stats on the Dashboard.');
      setTimeout(() => setSuccess(null), 2000);
      
      // Play sound
      if (audioRef.current) {
        audioRef.current.play();
      }
      
    } catch (err) {
      console.error('Error recording result:', err);
      setError(err.message || 'Failed to record result.');
    }
  };

  // Format time to mm:ss
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Get the name of the current subject
  const getCurrentSubjectName = () => {
    if (!currentSubjectId) return '';
    const subject = subjects.find(s => s.id === currentSubjectId);
    return subject ? subject.name : '';
  };

  if (loading) {
    return <div className="timer-loading">Loading subjects...</div>;
  }

  return (
    <div className="subject-timer-container">
      {/* Audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" />
      
      {/* Tab Switch Alert */}
      {showTabSwitchAlert && (
        <TabSwitchAlert 
          onClose={handleTabSwitchAlertClose} 
          onReset={resetTimer}
        />
      )}
      
      {error && (
        <div className="timer-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {success && (
        <div className="timer-success">
          <p>{success}</p>
        </div>
      )}
      
      <div className="timer-header">
        <h2>Subject Timer</h2>
        <p>Time yourself solving questions in each subject.</p>
      </div>
      
      <div className="subject-selector">
        <label htmlFor="subject-select">Select Subject:</label>
        <select 
          id="subject-select" 
          value={currentSubjectId || ''}
          onChange={handleSubjectChange}
          disabled={isRunning || subjects.length === 0}
        >
          {subjects.length === 0 ? (
            <option value="">No subjects available</option>
          ) : (
            subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))
          )}
        </select>
      </div>
      
      <div className="timer-card">
        <div className="subject-name">{getCurrentSubjectName()}</div>
        
        {/* Timer Preference Settings */}
        <div className="timer-preference-container">
          <h3>Set Target Time</h3>
          <div className="timer-preference-inputs">
            <div className="time-input-group">
              <label htmlFor="timer-minutes">Minutes:</label>
              <input 
                id="timer-minutes"
                type="number" 
                min="0"
                max="60"
                value={timerMinutes}
                onChange={handleMinutesChange}
                disabled={isRunning}
              />
            </div>
            
            <div className="time-input-group">
              <label htmlFor="timer-seconds">Seconds:</label>
              <input 
                id="timer-seconds"
                type="number" 
                min="0"
                max="59"
                value={timerSeconds}
                onChange={handleSecondsChange}
                disabled={isRunning}
              />
            </div>
            
            <button 
              className="save-preference-button"
              onClick={saveTimerPreference}
              disabled={isRunning || isSavingPreference}
            >
              {isSavingPreference ? 'Saving...' : 'Save Preference'}
            </button>
          </div>
          
          <div className="target-time-display">
            Target time: <span className="target-time-value">{formatTime(preferredTime)}</span>
          </div>
        </div>
        
        <div className={`timer-display ${isRunning ? 'running' : ''}`}>
          {formatTime(time)}
        </div>
        
        <div className="timer-controls">
          <button 
            className="start-timer"
            onClick={startTimer}
            disabled={isRunning || !currentSubjectId}
          >
            Start
          </button>
          
          <button 
            className="stop-timer"
            onClick={stopTimer}
            disabled={!isRunning}
          >
            Stop
          </button>
          
          <button 
            className="reset-timer"
            onClick={resetTimer}
            disabled={isRunning || time === 0}
          >
            Reset
          </button>
        </div>
        
        {time > 0 && !isRunning && !result && !tabSwitchDetected && (
          <div className="result-buttons">
            <p>Was your answer correct?</p>
            <div className="button-group">
              <button 
                className="correct-button"
                onClick={() => recordResult(true)}
              >
                Correct ✓
              </button>
              <button 
                className="incorrect-button"
                onClick={() => recordResult(false)}
              >
                Incorrect ✗
              </button>
            </div>
          </div>
        )}
        
        {result && (
          <div className={`result-display ${result.wasCorrect ? 'correct' : 'incorrect'} ${result.speed}`}>
            <h3>{result.wasCorrect ? 'Correct! ✓' : 'Incorrect ✗'}</h3>
            <p>Time taken: <strong>{formatTime(result.time)}</strong></p>
            <p className="speed-label">
              {result.speed === 'fast' ? 'FAST ⚡' : 'SLOW ⏰'}
              <span className="speed-details">
                ({result.time} seconds, Target: {preferredTime} seconds)
              </span>
            </p>
          </div>
        )}
      </div>
      
      <div className="timer-instructions">
        <h3>How to use the Subject Timer</h3>
        <ol>
          <li>Select a subject from the dropdown menu</li>
          <li>Set your target time for solving a question (minutes and seconds)</li>
          <li>Click "Save Preference" to save this time for future sessions</li>
          <li>Click "Start" to begin the timer</li>
          <li>Stay on this tab while solving the question</li>
          <li>When you've finished the question, click "Stop"</li>
          <li>Mark if your answer was correct or incorrect</li>
          <li>Your session will be recorded and available on the Dashboard</li>
        </ol>
        <p className="warning-note">Note: The timer will stop automatically if you switch to another tab!</p>
      </div>
    </div>
  );
};

export default SubjectTimer;
