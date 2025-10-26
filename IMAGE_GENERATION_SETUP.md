# Image Generation Setup Guide

This guide will help you set up and use the AI-powered image generation feature for lessons.

## Overview

When you select "Reading and Visual" learning style, you can now choose to generate 1 or 2 AI-generated images that will be automatically created based on your lesson content. Images are generated using **FREE Hugging Face Stable Diffusion models** and stored in Supabase Storage.

## Prerequisites

1. **Hugging Face API Key** - Completely FREE! Get from https://huggingface.co/settings/tokens
2. **Supabase Project** - Your Supabase project must have storage configured
3. **Supabase Storage Bucket** - A bucket named `lesson-generated-images` must be created

## Setup Instructions

### 1. Get FREE Hugging Face API Key

1. Go to https://huggingface.co/join and create a free account
2. Go to Settings → Access Tokens: https://huggingface.co/settings/tokens
3. Click **"New token"**
4. Name it (e.g., "lesson-ai")
5. Select **"read"** role
6. Click **"Generate token"**
7. Copy the token immediately (you won't see it again!)

### 2. Environment Variables

Make sure your `.env.local` file includes:

```bash
# Hugging Face API Key (required for image generation - 100% FREE!)
HUGGINGFACE_API_KEY=hf_your_token_here

# Supabase Configuration (already required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Create Supabase Storage Bucket

#### Option A: Automatic Creation (Recommended)
The system will attempt to create the bucket automatically on first image upload. If this fails, use Option B.

#### Option B: Manual Creation
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name:** `lesson-generated-images`
   - **Public bucket:** ✅ Checked (required for images to be viewable)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** `image/png`, `image/jpeg`, `image/jpg`, `image/webp`
6. Click **Create bucket**

### 4. Update Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add generated_images column if not exists
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS generated_images JSONB DEFAULT '[]'::jsonb;
```

Or simply run the updated schema files:
- `schema.sql` (for new installations)
- `schema-typescript-lessons.sql` (for existing installations)

## How It Works

### User Workflow

1. **Select Learning Style:** Choose "Reading and Visual" from the dropdown
2. **Choose Number of Images:** A new dropdown appears - select 1 or 2 images
3. **Generate Lesson:** Click "Generate Lesson with AI"
4. **Wait for Generation:** The lesson text is generated first, then images are created
5. **View Results:** Images appear automatically in the rendered lesson

### Technical Flow

```
User Submits Form
    ↓
API Creates Lesson Record (status: "generating")
    ↓
LLM Generates Text Content
    ↓
[If "Reading and Visual" with images selected]
    ↓
Extract Key Concepts from Content
    ↓
Generate Image Prompts (1 or 2)
    ↓
Generate Images in Parallel (Hugging Face Stable Diffusion)
    ↓
Upload Images to Supabase Storage (parallel)
    ↓
Add Images to lesson_structure.media[]
    ↓
Store Image URLs in generated_images column
    ↓
Generate TypeScript Component
    ↓
Update Lesson (status: "generated")
    ↓
User Views Lesson with Images
```

### Image Positioning

#### 1 Image
- Position: `full-width`
- Location: Prominently displayed in the lesson
- Prompt: Generated from key concepts across entire content

#### 2 Images
- First Image: `float-right` - Generated from first half concepts
- Second Image: `float-left` - Generated from second half concepts
- Content flows around the images naturally

## Image Generation Details

### Prompt Extraction
The system intelligently extracts key concepts from your lesson:
- **Headers** (## and ###) - Main topics
- **Bold text** (**text**) - Important concepts
- **Bullet points** - Key ideas

These concepts are combined into detailed, educational image prompts.

### Image Prompt Format
Generated prompts include:
- Key concepts from the lesson
- Educational context
- Style guidelines (clean, modern, labeled)
- Student-appropriate specifications

Example prompt:
```
Create a clear, educational illustration showing: photosynthesis, 
chloroplasts, sunlight energy conversion. Focus on introducing these 
core concepts visually. Use a clean, modern illustration style. 
Include clear labels and annotations. Use bright, engaging colors 
suitable for educational content.
```

### API Models Used
The system tries multiple Google models in order:
1. `imagen-3.0-generate-001` (if available)
2. `gemini-2.0-flash-exp` (with image capabilities)
3. `gemini-pro-vision` (fallback)

### Storage Structure
Images are stored in Supabase Storage:
```
lesson-generated-images/
  └── {lesson-id}/
      ├── {timestamp}-image-0.png
      └── {timestamp}-image-1.png
```

## Error Handling

The system is designed to be resilient:

- **Image generation fails:** Lesson saves with text content only
- **Storage upload fails:** Lesson completes without images
- **No Google API key:** Feature is silently disabled
- **Bucket doesn't exist:** System attempts auto-creation

All errors are logged to Sentry for monitoring.

## Performance Optimization

### Parallel Processing
Images are generated and uploaded in parallel:
- 2 images: Both generated simultaneously
- All uploads: Happen concurrently
- Typical time: 3-8 seconds for image generation

### Image Sizes
- Format: PNG
- Typical size: 500KB - 2MB per image
- Resolution: Optimized for web display
- Storage limit: 10MB per image

## Testing the Feature

### Test Checklist

1. ✅ **Basic Test - 1 Image**
   - Select "Reading and Visual"
   - Choose "1 Image"
   - Generate a lesson about "Solar System"
   - Verify image appears in lesson

2. ✅ **Multiple Images Test - 2 Images**
   - Select "Reading and Visual"
   - Choose "2 Images"
   - Generate a lesson about "Water Cycle"
   - Verify both images appear with correct positioning

3. ✅ **Fallback Test - Reading Only**
   - Select "Reading"
   - Notice no image dropdown appears
   - Generate lesson
   - Verify no images are generated

4. ✅ **Error Handling Test**
   - Temporarily remove GOOGLE_API_KEY
   - Generate with "Reading and Visual"
   - Verify lesson still generates (without images)
   - Check logs for graceful error handling

## Troubleshooting

### Images Not Appearing

**Check:**
1. Is `GOOGLE_API_KEY` set in `.env.local`?
2. Does the storage bucket exist and is it public?
3. Check browser console for CORS errors
4. Check server logs for API errors

**Solution:**
```bash
# Verify environment variable
echo $GOOGLE_API_KEY

# Check Supabase bucket permissions
# Go to Storage → lesson-generated-images → Settings
# Ensure "Public bucket" is enabled
```

### "Bucket not found" Error

**Solution:**
1. Go to Supabase Dashboard
2. Storage → Create new bucket
3. Name: `lesson-generated-images`
4. Make it public
5. Try generating again (system will auto-detect)

### Images Generate But Don't Display

**Check:**
1. Bucket permissions (must be public)
2. CORS configuration in Supabase
3. Image URLs in database (check `generated_images` column)

**Solution:**
```sql
-- Check if images are stored
SELECT id, title, generated_images 
FROM lessons 
WHERE generated_images IS NOT NULL;

-- Check lesson_structure media
SELECT id, title, lesson_structure->'media' 
FROM lessons 
WHERE jsonb_array_length(lesson_structure->'media') > 0;
```

### Slow Image Generation

**Expected behavior:**
- Text generation: 2-5 seconds
- Image generation (1): 3-5 seconds
- Image generation (2): 4-8 seconds (parallel)
- Total: 5-13 seconds

**If slower:**
1. Check Google API rate limits
2. Verify network connection
3. Check Supabase Storage performance

## API Costs

### Google AI Studio
- **Free tier:** 60 requests per minute
- **Image generation:** ~1-2 requests per image
- **Monthly free quota:** Check current Google AI Studio limits

### Supabase Storage
- **Free tier:** 1GB storage
- **Typical image size:** 0.5-2MB
- **Estimate:** 500-2000 images per GB

## Database Schema

### Lessons Table

```typescript
interface Lesson {
  id: string;
  title: string;
  content: string;
  status: 'generating' | 'generated' | 'error';
  generated_images: Array<{
    url: string;
    prompt: string;
    position: 'first-half' | 'second-half' | 'full';
  }>;
  lesson_structure: {
    media: Array<{
      id: string;
      type: 'image' | 'svg';
      url: string;
      alt: string;
      caption: string;
      position: 'inline' | 'float-left' | 'float-right' | 'full-width';
    }>;
    // ... other fields
  };
  // ... other fields
}
```

## Next Steps

1. ✅ Complete setup steps above
2. ✅ Test with a simple lesson
3. ✅ Monitor first few generations in logs
4. ✅ Adjust prompts if needed (in `lib/llm/gemini-image.ts`)
5. ✅ Set up error monitoring (already integrated with Sentry)

## Advanced Configuration

### Customizing Image Prompts

Edit `lib/llm/gemini-image.ts`:

```typescript
function createEducationalImagePrompt(
  concepts: string[], 
  section: 'overview' | 'introduction' | 'details'
): string {
  // Customize your prompt generation logic here
  // Add grade-level specific styling
  // Adjust for different subjects
}
```

### Changing Image Positioning

Edit `app/api/lessons/route.ts`:

```typescript
const mediaPosition = options.numberOfImages === 1 
  ? 'full-width'  // Change this
  : index === 0 ? 'float-right' : 'float-left';  // Or these
```

### Adjusting Storage Settings

Edit `lib/supabase/storage.ts`:

```typescript
const BUCKET_NAME = 'lesson-generated-images';  // Change bucket name
// Adjust file size limits, MIME types, etc.
```

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Test with "Reading" style first to isolate image issues
4. Check Sentry for error tracking

## Feature Changelog

### v1.0.0 - Initial Release
- ✅ Conditional dropdown for image count (1-2)
- ✅ Google AI image generation integration
- ✅ Supabase Storage integration
- ✅ Parallel image generation and upload
- ✅ Automatic prompt extraction from content
- ✅ Content-aware image positioning
- ✅ Graceful error handling
- ✅ Full TypeScript support

