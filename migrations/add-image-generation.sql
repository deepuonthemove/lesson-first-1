-- Migration: Add Image Generation Support
-- Date: 2025-10-26
-- Description: Adds support for AI-generated images in lessons

-- Add generated_images column to store image metadata
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS generated_images JSONB DEFAULT '[]'::jsonb;

-- Add index for querying lessons with generated images
CREATE INDEX IF NOT EXISTS idx_lessons_generated_images 
ON lessons USING GIN (generated_images);

-- Add comment explaining the column
COMMENT ON COLUMN lessons.generated_images IS 
'Array of AI-generated images with metadata: [{ url: string, prompt: string, position: string }]';

-- Example queries:

-- Find all lessons with generated images
-- SELECT id, title, generated_images 
-- FROM lessons 
-- WHERE jsonb_array_length(generated_images) > 0;

-- Find lessons with specific number of images
-- SELECT id, title, jsonb_array_length(generated_images) as image_count
-- FROM lessons 
-- WHERE jsonb_array_length(generated_images) = 2;

-- Get all image URLs from a lesson
-- SELECT id, title, 
--        jsonb_array_elements(generated_images)->>'url' as image_url,
--        jsonb_array_elements(generated_images)->>'prompt' as image_prompt
-- FROM lessons 
-- WHERE id = 'your-lesson-id';

