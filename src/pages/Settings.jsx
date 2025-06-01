import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import '../styles/Settings.css';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // User settings
  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [themePreference, setThemePreference] = useState('system');
  const [subjects, setSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  
  // User data
  const [userId, setUserId] = useState(null);
  const [userPrefs, setUserPrefs] = useState(null);

  // Fetch user data and settings on component mount
  useEffect(() => {
    const fetchUserData = async () => {
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
        
        // Fetch available exams
        const { data: examData, error: examError } = await supabase
          .from('exam_subjects')
          .select('exam_name');
        
        if (examError) throw examError;
        
        // Extract unique exam names
        const uniqueExams = [...new Set(examData.map(item => item.exam_name))].sort();
        setExamList(uniqueExams);
        
        // Fetch user preferences
        const { data: preferences, error: prefError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (prefError && prefError.code !== 'PGRST116') throw prefError;
        
        // If user has preferences, set them
        if (preferences) {
          setUserPrefs(preferences);
          setSelectedExam(preferences.entrance_exam || '');
          setThemePreference(preferences.theme_preference || 'system');
          
          // Apply theme from preferences
          applyTheme(preferences.theme_preference || 'system');
        }
        
        // Fetch user subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id);
        
        if (subjectsError) throw subjectsError;
        
        if (subjectsData) {
          setSubjects(subjectsData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user settings.');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Apply theme based on preference
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else if (theme === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    } else {
      // System preference
      document.body.classList.remove('light-mode', 'dark-mode');
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.add('light-mode');
      }
    }
    
    // Save to localStorage as well
    localStorage.setItem('theme', theme);
  };

  // Handle theme change
  const handleThemeChange = (theme) => {
    setThemePreference(theme);
    applyTheme(theme);
    saveUserPreferences({ theme_preference: theme });
  };

  // Handle exam selection change
  const handleExamChange = async (e) => {
    const newExam = e.target.value;
    setSelectedExam(newExam);
    
    try {
      // Fetch subjects for this exam
      const { data: examSubjectsData, error: subjectsError } = await supabase
        .from('exam_subjects')
        .select('subject_name')
        .eq('exam_name', newExam);
      
      if (subjectsError) throw subjectsError;
      
      // Get default subjects for this exam
      const defaultSubjects = examSubjectsData.map(item => item.subject_name);
      
      // Filter existing subjects to keep custom ones
      const customSubjects = subjects.filter(sub => sub.is_custom);
      
      // Find existing non-custom subjects
      const existingNonCustomSubjects = subjects.filter(sub => !sub.is_custom);
      const existingNonCustomSubjectNames = existingNonCustomSubjects.map(sub => sub.name);
      
      // Calculate subjects to add (only new ones)
      const subjectsToAdd = defaultSubjects.filter(name => !existingNonCustomSubjectNames.includes(name));
      
      // Calculate subjects to potentially deactivate
      const subjectsToDeactivate = existingNonCustomSubjects.filter(sub => !defaultSubjects.includes(sub.name));
      
      // Step 1: Deactivate subjects that are not in the new exam
      if (subjectsToDeactivate.length > 0) {
        const deactivatePromises = subjectsToDeactivate.map(async (subject) => {
          return supabase
            .from('subjects')
            .update({ is_active: false })
            .eq('id', subject.id);
        });
        
        const deactivateResults = await Promise.all(deactivatePromises);
        const deactivateErrors = deactivateResults.filter(result => result.error);
        
        if (deactivateErrors.length > 0) {
          console.error("Errors deactivating subjects:", deactivateErrors);
        }
      }
      
      // Step 2: Add new subjects one by one to avoid RLS issues
      if (subjectsToAdd.length > 0) {
        const addPromises = subjectsToAdd.map(async (subjectName) => {
          return supabase
            .from('subjects')
            .insert({
              name: subjectName,
              user_id: userId,
              is_custom: false,
              is_active: true
            });
        });
        
        const addResults = await Promise.all(addPromises);
        const addErrors = addResults.filter(result => result.error);
        
        if (addErrors.length > 0) {
          console.error("Errors adding subjects:", addErrors);
        }
      }

      // Step 3: Activate the subjects that belong to the selected exam
      // This is the key fix - we need to set is_active=true for all subjects in the new exam
      const subjectsToActivate = existingNonCustomSubjects.filter(sub => defaultSubjects.includes(sub.name));
      
      if (subjectsToActivate.length > 0) {
        const activatePromises = subjectsToActivate.map(async (subject) => {
          return supabase
            .from('subjects')
            .update({ is_active: true })
            .eq('id', subject.id);
        });
        
        const activateResults = await Promise.all(activatePromises);
        const activateErrors = activateResults.filter(result => result.error);
        
        if (activateErrors.length > 0) {
          console.error("Errors activating subjects:", activateErrors);
        }
      }
      
      // Save the preference changes
      await saveUserPreferences({ entrance_exam: newExam });
      
      // Fetch all subjects again to get updated list with IDs
      const { data: refreshedSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId);
      
      if (fetchError) throw fetchError;
      
      setSubjects(refreshedSubjects);
      setSuccess('Exam selection updated successfully!');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating exam:', err);
      setError(err.message || 'Failed to update exam settings.');
    }
  };

  // Save user preferences to database
  const saveUserPreferences = async (updatedPrefs) => {
    try {
      if (!userId) return;
      
      const prefs = {
        id: userId,
        entrance_exam: updatedPrefs.entrance_exam || selectedExam,
        theme_preference: updatedPrefs.theme_preference || themePreference
      };
      
      // If user already has preferences, update them
      if (userPrefs) {
        const { error } = await supabase
          .from('user_preferences')
          .update(prefs)
          .eq('id', userId);
        
        if (error) throw error;
      } 
      // Otherwise insert new preferences
      else {
        const { error } = await supabase
          .from('user_preferences')
          .insert([prefs]);
        
        if (error) throw error;
        
        // Update userPrefs state
        setUserPrefs(prefs);
      }
      
      // Show success message
      setSuccess('Settings saved successfully!');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.message || 'Failed to save preferences.');
    }
  };

  // Update subjects in database
  const updateSubjects = async (newSubjects) => {
    try {
      if (!userId) return;
      
      // First, delete all non-custom subjects for this user
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('user_id', userId)
        .eq('is_custom', false);
      
      if (deleteError) throw deleteError;
      
      // Then insert new subjects (only non-custom ones, as custom ones are preserved)
      const subjectsToInsert = newSubjects
        .filter(sub => !sub.is_custom)
        .map(sub => ({
          name: sub.name,
          user_id: userId,
          is_custom: false
        }));
      
      if (subjectsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('subjects')
          .insert(subjectsToInsert);
        
        if (insertError) throw insertError;
      }
      
      // Fetch all subjects again to get updated list with IDs
      const { data: updatedSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId);
      
      if (fetchError) throw fetchError;
      
      setSubjects(updatedSubjects);
      
    } catch (err) {
      console.error('Error updating subjects:', err);
      setError(err.message || 'Failed to update subjects.');
    }
  };

  // Add a custom subject
  const addCustomSubject = async () => {
    if (!customSubject.trim() || !userId) return;
    
    try {
      // Check if this subject already exists
      if (subjects.some(s => s.name.toLowerCase() === customSubject.trim().toLowerCase())) {
        setError('This subject already exists.');
        return;
      }
      
      // Create new subject object
      const newSubject = {
        name: customSubject.trim(),
        user_id: userId,
        is_custom: true
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('subjects')
        .insert([newSubject])
        .select();
      
      if (error) throw error;
      
      // Update subjects state
      setSubjects([...subjects, data[0]]);
      setCustomSubject('');
      setSuccess('Subject added successfully!');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error adding custom subject:', err);
      setError(err.message || 'Failed to add custom subject.');
    }
  };

  // Delete a subject
  const deleteSubject = async (subjectId, isCustom) => {
    // Only allow deleting custom subjects
    if (!isCustom) {
      setError('You can only delete custom subjects.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);
      
      if (error) throw error;
      
      // Update subjects state
      setSubjects(subjects.filter(s => s.id !== subjectId));
      setSuccess('Subject deleted successfully!');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError(err.message || 'Failed to delete subject.');
    }
  };

  // Toggle subject active status
  const toggleSubjectActive = async (subjectId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: !currentStatus })
        .eq('id', subjectId);
      
      if (error) throw error;
      
      // Update subjects state
      setSubjects(subjects.map(s => 
        s.id === subjectId ? { ...s, is_active: !s.is_active } : s
      ));
      
    } catch (err) {
      console.error('Error toggling subject:', err);
      setError(err.message || 'Failed to update subject.');
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <h1>Settings</h1>
      
      {error && (
        <div className="settings-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {success && (
        <div className="settings-success">
          <p>{success}</p>
        </div>
      )}
      
      <section className="settings-section">
        <h2>Entrance Exam</h2>
        <p>Select your entrance exam to customize subjects.</p>
        
        <div className="settings-control">
          <label htmlFor="exam-select">Entrance Exam</label>
          <select 
            id="exam-select" 
            value={selectedExam}
            onChange={handleExamChange}
          >
            <option value="">Select Exam</option>
            {examList.map(exam => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>
        </div>
      </section>
      
      <section className="settings-section">
        <h2>Theme Preference</h2>
        <p>Choose your preferred app theme.</p>
        
        <div className="theme-options">
          <button 
            className={`theme-button ${themePreference === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            <span className="theme-icon">☀️</span>
            <span>Light</span>
          </button>
          
          <button 
            className={`theme-button ${themePreference === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            <span className="theme-icon">🌙</span>
            <span>Dark</span>
          </button>
          
          <button 
            className={`theme-button ${themePreference === 'system' ? 'active' : ''}`}
            onClick={() => handleThemeChange('system')}
          >
            <span className="theme-icon">⚙️</span>
            <span>System</span>
          </button>
        </div>
      </section>
      
      <section className="settings-section">
        <h2>Subjects</h2>
        <p>Manage your subjects for practice.</p>
        
        <div className="subjects-list">
          {subjects.length === 0 ? (
            <p className="no-subjects">No subjects available. Please select an exam or add custom subjects.</p>
          ) : (
            <ul>
              {/* Modified filter to show subjects that are active AND from current exam OR custom */}
              {subjects
                .filter(subject => {
                  // Always show custom subjects
                  if (subject.is_custom) return true;
                  
                  // For non-custom subjects, only show active ones related to current exam
                  return subject.is_active === true;
                })
                .map(subject => (
                <li key={subject.id || subject.name} className={subject.is_custom ? 'custom-subject' : ''}>
                  <div className="subject-info">
                    <span className="subject-name">{subject.name}</span>
                    {subject.is_custom && <span className="custom-badge">Custom</span>}
                  </div>
                  <div className="subject-actions">
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={subject.is_active !== false} // Default to true if undefined
                        onChange={() => toggleSubjectActive(subject.id, subject.is_active)}
                        disabled={!subject.id} // Disable if not yet saved
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    
                    {subject.is_custom && (
                      <button 
                        className="delete-subject"
                        onClick={() => deleteSubject(subject.id, subject.is_custom)}
                        title="Delete Subject"
                        aria-label="Delete Subject"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="add-subject">
          <input
            type="text"
            placeholder="Add Custom Subject"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomSubject()}
          />
          <button 
            onClick={addCustomSubject}
            disabled={!customSubject.trim()}
          >
            Add
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
