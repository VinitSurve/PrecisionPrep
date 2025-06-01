import { supabase } from '../supabase/client';

/**
 * Fetch all available exams
 * @returns {Promise<Array>} Array of exam names
 */
export const fetchExams = async () => {
  try {
    const { data, error } = await supabase
      .from('exam_subjects')
      .select('exam_name');
    
    if (error) throw error;
    
    // Extract unique exam names using Set
    const uniqueExams = [...new Set(data.map(item => item.exam_name))].sort();
    return uniqueExams;
  } catch (error) {
    console.error('Error fetching exams:', error);
    throw error;
  }
};

/**
 * Fetch subjects for a specific exam
 * @param {string} examName - The name of the exam
 * @returns {Promise<Array>} Array of subject names
 */
export const fetchSubjectsForExam = async (examName) => {
  try {
    const { data, error } = await supabase
      .from('exam_subjects')
      .select('subject_name')
      .eq('exam_name', examName)
      .order('subject_name');
    
    if (error) throw error;
    
    return data.map(item => item.subject_name);
  } catch (error) {
    console.error(`Error fetching subjects for ${examName}:`, error);
    throw error;
  }
};

/**
 * Set up user preferences and subjects
 * @param {string} userId - User's ID
 * @param {string} examName - Selected exam name
 * @param {string} themePreference - Selected theme preference
 * @returns {Promise<void>}
 */
export const setupUserProfile = async (userId, examName, themePreference) => {
  try {
    // 1. Insert user preferences
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .insert([{
        id: userId,
        entrance_exam: examName,
        theme_preference: themePreference
      }]);
    
    if (preferencesError) throw preferencesError;
    
    // 2. Get subjects for the selected exam
    const subjects = await fetchSubjectsForExam(examName);
    
    // 3. Insert subjects for the user
    const subjectsToInsert = subjects.map(subject => ({
      user_id: userId,
      name: subject,
      is_custom: false
    }));
    
    const { error: subjectsError } = await supabase
      .from('subjects')
      .insert(subjectsToInsert);
    
    if (subjectsError) throw subjectsError;
    
  } catch (error) {
    console.error('Error setting up user profile:', error);
    throw error;
  }
};

/**
 * Check if user has completed onboarding
 * @param {string} userId - User's ID
 * @returns {Promise<boolean>} True if user has preferences, false otherwise
 */
export const hasCompletedOnboarding = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking if user has completed onboarding:', error);
    return false;
  }
};
