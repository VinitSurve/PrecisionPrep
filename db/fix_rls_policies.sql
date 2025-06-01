-- Enable RLS for public schema tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences table
DROP POLICY IF EXISTS "Read own preferences" ON public.user_preferences;
CREATE POLICY "Read own preferences" 
  ON public.user_preferences 
  FOR SELECT 
  TO public 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for subjects table
DROP POLICY IF EXISTS "Read own subjects" ON public.subjects;
CREATE POLICY "Read own subjects" 
  ON public.subjects 
  FOR SELECT 
  TO public 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
CREATE POLICY "Users can insert their own subjects" 
  ON public.subjects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
CREATE POLICY "Users can update their own subjects" 
  ON public.subjects 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;
CREATE POLICY "Users can delete their own subjects" 
  ON public.subjects 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create policies for sessions table
DROP POLICY IF EXISTS "Allow session creation" ON public.sessions;
CREATE POLICY "Allow session creation" 
  ON public.sessions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.sessions;
CREATE POLICY "Users can manage their own sessions" 
  ON public.sessions 
  FOR ALL 
  TO public 
  USING (auth.uid() = user_id);
  
-- Print confirmation
SELECT 'RLS policies successfully updated' AS message;
