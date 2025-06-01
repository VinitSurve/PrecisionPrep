-- Update the subject_id foreign key constraint to SET NULL on delete

-- First, drop the existing constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_subject_id_fkey;

-- Add it back with ON DELETE SET NULL
ALTER TABLE public.events 
  ADD CONSTRAINT events_subject_id_fkey 
  FOREIGN KEY (subject_id)
  REFERENCES public.subjects(id)
  ON DELETE SET NULL;
