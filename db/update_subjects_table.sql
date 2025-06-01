-- Add timer preference columns to subjects table
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS timer_minutes INTEGER DEFAULT 2;

ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0;

-- Update existing records to have a default value of 2 minutes
UPDATE subjects
SET timer_minutes = 2
WHERE timer_minutes IS NULL;
