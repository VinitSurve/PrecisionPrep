import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { debounce } from '../utils/throttle';
import { getCurrentUser } from '../supabase/client';
import logo from '../assets/PrecisionPrep.png';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [examList, setExamList] = useState([]);
  const [examSubjects, setExamSubjects] = useState({});
  const navigate = useNavigate();

  // Add a ref to track if we've started the user check process
  const userCheckRef = useRef(false);

  // Fetch available exams and their subjects
  useEffect(() => {
    const fetchExamsAndSubjects = async () => {
      try {
        // Get all exam names - using a different approach without distinctOn
        const { data: examData, error: examError } = await supabase
          .from('exam_subjects')
          .select('exam_name');
        
        if (examError) throw examError;
        
        // Extract unique exam names
        const uniqueExams = [...new Set(examData.map(item => item.exam_name))].sort();
        setExamList(uniqueExams);
        
        // Get all exam subjects
        const { data: subjects, error: subjectsError } = await supabase
          .from('exam_subjects')
          .select('*')
          .order('subject_name');
        
        if (subjectsError) throw subjectsError;
        
        // Group subjects by exam
        const subjectsByExam = {};
        subjects.forEach(item => {
          if (!subjectsByExam[item.exam_name]) {
            subjectsByExam[item.exam_name] = [];
          }
          subjectsByExam[item.exam_name].push(item.subject_name);
        });
        
        setExamSubjects(subjectsByExam);
      } catch (err) {
        setError('Failed to load exams and subjects. Please refresh the page.');
        console.error('Error fetching exams:', err);
      }
    };
    
    fetchExamsAndSubjects();
  }, []);

  // Check if user is authenticated and doesn't already have preferences
  useEffect(() => {
    // Skip if we've already started checking
    if (userCheckRef.current) return;
    userCheckRef.current = true;
    
    const checkUserAndPreferences = async () => {
      try {
        // First, get the user ID from localStorage if it's there (recently signed up)
        const storedUserId = localStorage.getItem('auth_user_id');
        
        // Try to get the current user from Supabase auth using our helper function
        const currentUser = await getCurrentUser();
        
        // If no user is found and we have a stored ID, try to use it
        if (!currentUser && !storedUserId) {
          console.log("No authenticated user found");
          navigate('/login', { replace: true });
          return;
        }
        
        const authUser = currentUser || { id: storedUserId };
        setUser(authUser);
        
        // Log the current auth state for debugging - once is enough
        console.log("Current auth user:", authUser);
        
        // Check if user already has preferences - using our helper
        const { data: preferences, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
      
        if (error && error.code !== 'PGRST116') {
          console.error("Error checking preferences:", error);
          throw error;
        }
        
        // If user already has preferences, redirect to dashboard
        if (preferences) {
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Set initial theme preference based on system/localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          setSelectedTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setSelectedTheme('dark');
        }
        
      } catch (err) {
        console.error("Onboarding error:", err);
        setError(err.message || 'An error occurred while checking user preferences.');
      }
    };
    
    checkUserAndPreferences();
  }, [navigate]); // Only depend on navigate to prevent re-runs

  const handleExamSelect = (e) => {
    setSelectedExam(e.target.value);
  };

  const handleThemeSelect = (theme) => {
    setSelectedTheme(theme);
  };

  const nextStep = () => {
    if (step === 1 && !selectedExam) {
      setError('Please select an entrance exam to continue');
      return;
    }
    
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    } else {
      // System preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      localStorage.setItem('theme', 'system');
    }
  };

  // Optimize the finishOnboarding function
  const finishOnboarding = async () => {
    if (!user || !selectedExam || !examSubjects[selectedExam]) {
      setError("Missing required information to complete onboarding");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Use the user ID directly
      const userId = user.id;
      
      console.log("Attempting to save user preferences with ID:", userId);
      
      // Set a flag before any database operations
      window.localStorage.setItem('onboarding_in_progress', 'true');
      
      // 1. Insert user preferences
      const { error: preferencesError } = await supabase.from('user_preferences').insert({
        id: userId,
        entrance_exam: selectedExam,
        theme_preference: selectedTheme
      });
      
      if (preferencesError) {
        console.error('Error inserting user preferences:', preferencesError);
        throw new Error(`Failed to save preferences: ${preferencesError.message}`);
      }
      
      console.log("User preferences saved successfully");
      
      // 2. Insert subjects based on selected exam
      const subjectsToInsert = examSubjects[selectedExam].map(subject => ({
        user_id: userId,
        name: subject,
        is_custom: false
      }));
      
      const { error: subjectsError } = await supabase.from('subjects').insert(subjectsToInsert);
      
      if (subjectsError) {
        console.error('Error inserting subjects:', subjectsError);
        throw new Error(`Failed to save subjects: ${subjectsError.message}`);
      }
      
      console.log("Subjects saved successfully");
      
      // 3. Apply selected theme
      applyTheme(selectedTheme);
      
      // 4. Clean up the stored user ID and set completion flag
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('onboarding_in_progress');
      localStorage.setItem('onboarding_completed', 'true');
      
      // 5. Use a cleaner method to dispatch the storage event for App.jsx to detect
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'onboarding_completed',
        newValue: 'true'
      }));
      
      // 6. Navigate with replace to prevent back button issues
      navigate('/dashboard', { replace: true });
      
    } catch (err) {
      localStorage.removeItem('onboarding_in_progress');
      console.error("Onboarding error:", err);
      setError(err.message || 'Failed to complete onboarding. Please try again.');
      setLoading(false);
    }
  };

  // Render step 1: Exam selection
  const renderExamSelection = () => (
    <div className="onboarding-step">
      <h2>Select Your Entrance Exam</h2>
      <p className="step-description">
        Choose the entrance exam you're preparing for. We'll customize your experience accordingly.
      </p>
      
      <div className="form-group">
        <select 
          value={selectedExam}
          onChange={handleExamSelect}
          className="onboarding-select"
          required
        >
          <option value="">-- Select Exam --</option>
          {examList.map(exam => (
            <option key={exam} value={exam}>{exam}</option>
          ))}
        </select>
      </div>
      
      {selectedExam && examSubjects[selectedExam] && (
        <div className="subjects-preview">
          <h3>Subjects included:</h3>
          <ul>
            {examSubjects[selectedExam].map(subject => (
              <li key={subject}>{subject}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="onboarding-actions">
        <button 
          className="onboarding-button next-button" 
          onClick={nextStep}
          disabled={!selectedExam}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Render step 2: Theme selection
  const renderThemeSelection = () => (
    <div className="onboarding-step">
      <h2>Choose Your Preferred Theme</h2>
      <p className="step-description">
        Select a theme for the app. You can change this later in settings.
      </p>
      
      <div className="theme-options">
        <div 
          className={`theme-option ${selectedTheme === 'light' ? 'selected' : ''}`}
          onClick={() => handleThemeSelect('light')}
        >
          <div className="theme-preview light-theme">
            <span>Aa</span>
          </div>
          <span>Light</span>
        </div>
        
        <div 
          className={`theme-option ${selectedTheme === 'dark' ? 'selected' : ''}`}
          onClick={() => handleThemeSelect('dark')}
        >
          <div className="theme-preview dark-theme">
            <span>Aa</span>
          </div>
          <span>Dark</span>
        </div>
        
        <div 
          className={`theme-option ${selectedTheme === 'system' ? 'selected' : ''}`}
          onClick={() => handleThemeSelect('system')}
        >
          <div className="theme-preview system-theme">
            <span>Aa</span>
          </div>
          <span>System Default</span>
        </div>
      </div>
      
      <div className="onboarding-actions">
        <button className="onboarding-button back-button" onClick={prevStep}>
          Back
        </button>
        <button 
          className="onboarding-button next-button" 
          onClick={nextStep}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Render step 3: Confirmation
  const renderConfirmation = () => (
    <div className="onboarding-step">
      <h2>All Set!</h2>
      <p className="step-description">
        We're ready to set up your PrecisionPrep experience with the following preferences:
      </p>
      
      <div className="confirmation-details">
        <div className="confirmation-item">
          <h3>Entrance Exam:</h3>
          <p>{selectedExam}</p>
        </div>
        
        <div className="confirmation-item">
          <h3>Theme Preference:</h3>
          <p>{selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}</p>
        </div>
        
        {selectedExam && examSubjects[selectedExam] && (
          <div className="confirmation-item">
            <h3>Subjects to be added:</h3>
            <ul>
              {examSubjects[selectedExam].map(subject => (
                <li key={subject}>{subject}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="onboarding-actions">
        <button className="onboarding-button back-button" onClick={prevStep}>
          Back
        </button>
        <button 
          className="onboarding-button complete-button" 
          onClick={finishOnboarding}
          disabled={loading}
        >
          {loading ? 'Setting up...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <div className="logo-container">
          <img src={logo} alt="PrecisionPrep Logo" className="onboarding-logo" />
        </div>
        <h1>Welcome to PrecisionPrep</h1>
        <p>Let's set up your account in a few quick steps</p>
      </div>
      
      <div className="onboarding-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <div className="progress-circle">1</div>
          <span>Exam</span>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <div className="progress-circle">2</div>
          <span>Theme</span>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
          <div className="progress-circle">3</div>
          <span>Complete</span>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="onboarding-content">
        {step === 1 && renderExamSelection()}
        {step === 2 && renderThemeSelection()}
        {step === 3 && renderConfirmation()}
      </div>
    </div>
  );
};

export default Onboarding;
