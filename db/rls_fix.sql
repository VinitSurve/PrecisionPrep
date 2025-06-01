-- Function to check policy permissions
CREATE OR REPLACE FUNCTION public.check_policy_permission(
  table_name text,
  operation text,
  record_data jsonb DEFAULT '{}'::jsonb
) RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  -- Log attempt for debugging
  RAISE NOTICE 'Checking % permission on % for user %', operation, table_name, auth.uid();
  
  -- Run different checks based on operation type
  CASE 
    WHEN operation = 'SELECT' THEN
      EXECUTE format('SELECT EXISTS (
        SELECT 1 FROM %I LIMIT 1
      )', table_name) INTO result;
    WHEN operation = 'INSERT' THEN
      -- For insert we would need to actually check the RLS policy
      result := true; -- Simplified for this example
    ELSE
      result := false;
  END CASE;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error checking permission: %', SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS for tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Enable read for users" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.user_preferences;

DROP POLICY IF EXISTS "Enable read for users" ON public.subjects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.subjects;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.subjects;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.subjects;

-- Create comprehensive policies for user_preferences
CREATE POLICY "Enable read for users"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Enable delete for users based on id"
  ON public.user_preferences
  FOR DELETE
  USING (auth.uid() = id);

-- Create comprehensive policies for subjects
CREATE POLICY "Enable read for users"
  ON public.subjects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users"
  ON public.subjects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on id"
  ON public.subjects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on id"
  ON public.subjects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.subjects TO authenticated;

-- Grant permissions to anon users for read access
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.user_preferences TO anon;
GRANT SELECT ON public.subjects TO anon;
GRANT SELECT ON public.exam_subjects TO anon;
