-- Update lessons table to support TypeScript generation
-- Run this migration to add TypeScript-related columns

-- Add TypeScript code column
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS typescript_code TEXT;

-- Add compiled JavaScript code column
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS javascript_code TEXT;

-- Add structured lesson data column (JSONB for better querying)
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_structure JSONB;

-- Add generated images column for AI-generated images
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS generated_images JSONB DEFAULT '[]'::jsonb;

-- Add updated_at column if it doesn't exist
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on lesson_structure for faster queries
CREATE INDEX IF NOT EXISTS idx_lessons_structure 
ON lessons USING GIN (lesson_structure);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the structure
COMMENT ON COLUMN lessons.lesson_structure IS 
'Structured JSON representation of the lesson with sections, media, and metadata';

COMMENT ON COLUMN lessons.typescript_code IS 
'Generated TypeScript component code for dynamic rendering';

COMMENT ON COLUMN lessons.javascript_code IS 
'Compiled JavaScript code from TypeScript';

-- Example query to find lessons with images
-- SELECT id, title, lesson_structure->'media' as media_items
-- FROM lessons
-- WHERE lesson_structure->'media' @> '[{"type": "image"}]';

-- Example query to find lessons by difficulty
-- SELECT id, title, lesson_structure->'metadata'->>'difficulty' as difficulty
-- FROM lessons
-- WHERE lesson_structure->'metadata'->>'difficulty' = 'beginner';

