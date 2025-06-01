-- Create events table to track tab switches and other events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  subject_id UUID REFERENCES public.subjects NULL,
  type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  details JSONB NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_subject_id_idx ON public.events(subject_id);
CREATE INDEX IF NOT EXISTS events_timestamp_idx ON public.events(timestamp);
CREATE INDEX IF NOT EXISTS events_type_idx ON public.events(type);

-- Add RLS policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own events
CREATE POLICY "Allow users to insert their own events" 
  ON public.events
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to read their own events
CREATE POLICY "Allow users to read their own events" 
  ON public.events
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);
