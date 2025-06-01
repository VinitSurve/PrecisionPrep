-- Fix the RLS policies for the subjects table
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean setup
DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can read their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;

-- Create comprehensive policies
-- Policy to allow users to SELECT their own subjects
CREATE POLICY "Users can read their own subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy to allow users to INSERT their own subjects
CREATE POLICY "Users can insert their own subjects"
ON public.subjects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to UPDATE their own subjects
CREATE POLICY "Users can update their own subjects"
ON public.subjects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy to allow users to DELETE their own subjects
CREATE POLICY "Users can delete their own subjects"
ON public.subjects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions to the authenticated role
GRANT ALL ON public.subjects TO authenticated;
