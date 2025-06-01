import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';

const Timer = () => {
  // Initialize preferredTime from localStorage or use default values
  const [preferredTime, setPreferredTime] = useState(() => {
    const savedTime = localStorage.getItem('PrecisionPrep_preferred_time');
    return savedTime ? JSON.parse(savedTime) : { minutes: 1, seconds: 30 };
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [speed, setSpeed] = useState(null);
  const [wasCorrect, setWasCorrect] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Convert preferred time to seconds
  const preferredTimeInSeconds = preferredTime.minutes * 60 + preferredTime.seconds;

  // Format time as mm:ss
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start the timer
  const startTimer = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsComplete(false);
    setElapsedTime(0);
    setSpeed(null);
    setWasCorrect(null);
    setError(null);
    setSuccess(false);
    
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(currentElapsed);
    }, 100);
  };

  // Stop the timer
  const stopTimer = () => {
    if (!isRunning) return;
    
    clearInterval(timerRef.current);
    setIsRunning(false);
    setIsComplete(true);
    
    // Determine if speed was fast or slow
    const finalSpeed = elapsedTime <= preferredTimeInSeconds ? 'fast' : 'slow';
    setSpeed(finalSpeed);
  };

  // Reset the timer
  const resetTimer = () => {
    clearInterval(timerRef.current);
    setElapsedTime(0);
    setIsRunning(false);
    setIsComplete(false);
    setSpeed(null);
    setWasCorrect(null);
    setError(null);
    setSuccess(false);
  };

  // Handle preferred time input changes
  const handlePreferredTimeChange = (e, type) => {
    const value = parseInt(e.target.value, 10) || 0;
    const updatedTime = {
      ...preferredTime,
      [type]: value
    };
    
    // Update state
    setPreferredTime(updatedTime);
    
    // Save to localStorage
    localStorage.setItem('PrecisionPrep_preferred_time', JSON.stringify(updatedTime));
  };

  // Handle correct/incorrect selection
  const handleCorrectSelection = async (correct) => {
    setWasCorrect(correct);
    
    try {
      setSaving(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to save results');
        setSaving(false);
        return;
      }
      
      // Save session to Supabase
      const { error: saveError } = await supabase.from('sessions').insert({
        user_id: user.id,
        time_taken: elapsedTime,
        was_correct: correct,
        auto_evaluated: false,
        preferred_time: preferredTimeInSeconds,
        speed: speed,
        created_at: new Date().toISOString()
      });
      
      if (saveError) {
        throw saveError;
      }
      
      setSuccess(true);
      setSaving(false);
    } catch (err) {
      setError(err.message || 'Failed to save session');
      setSaving(false);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="timer-container">
      <h2>Question Timer</h2>
      
      {/* Preferred time input */}
      <div className="preferred-time-container">
        <h3>Set your target time:</h3>
        <div className="time-inputs">
          <div className="time-input-group">
            <label htmlFor="minutes">Minutes:</label>
            <input
              type="number"
              id="minutes"
              min="0"
              max="59"
              value={preferredTime.minutes}
              onChange={(e) => handlePreferredTimeChange(e, 'minutes')}
              disabled={isRunning}
            />
          </div>
          <div className="time-input-group">
            <label htmlFor="seconds">Seconds:</label>
            <input
              type="number"
              id="seconds"
              min="0"
              max="59"
              value={preferredTime.seconds}
              onChange={(e) => handlePreferredTimeChange(e, 'seconds')}
              disabled={isRunning}
            />
          </div>
        </div>
        <p className="target-time">Target time: {formatTime(preferredTimeInSeconds)}</p>
      </div>
      
      {/* Timer display */}
      <div className={`timer-display ${isRunning ? 'running' : ''} ${speed === 'fast' ? 'fast' : ''} ${speed === 'slow' ? 'slow' : ''}`}>
        {formatTime(elapsedTime)}
      </div>
      
      {/* Timer controls */}
      <div className="timer-controls">
        {!isRunning && !isComplete && (
          <button className="start-button" onClick={startTimer}>Start Timer</button>
        )}
        {isRunning && (
          <button className="stop-button" onClick={stopTimer}>Stop Timer</button>
        )}
        {!isRunning && (
          <button className="reset-button" onClick={resetTimer}>Reset</button>
        )}
      </div>
      
      {/* Result section */}
      {isComplete && (
        <div className="result-section">
          <h3>Result</h3>
          <p>Time taken: {formatTime(elapsedTime)}</p>
          <p>Speed: <span className={speed}>{speed}</span></p>
          
          {wasCorrect === null && !saving && !success && (
            <div className="correct-buttons">
              <p>Was your answer correct?</p>
              <div>
                <button 
                  className="correct-button"
                  onClick={() => handleCorrectSelection(true)}
                >
                  Yes ✓
                </button>
                <button 
                  className="incorrect-button"
                  onClick={() => handleCorrectSelection(false)}
                >
                  No ✗
                </button>
              </div>
            </div>
          )}
          
          {saving && <p>Saving your result...</p>}
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">Result saved successfully!</p>}
          
          {wasCorrect !== null && !saving && (
            <p>Answer: <span className={wasCorrect ? 'correct' : 'incorrect'}>
              {wasCorrect ? 'Correct ✓' : 'Incorrect ✗'}
            </span></p>
          )}
        </div>
      )}
    </div>
  );
};

export default Timer;
