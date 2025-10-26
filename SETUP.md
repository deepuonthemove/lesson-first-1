# Lesson AI - Setup Instructions

This is a two-page full-stack application that allows you to generate and view AI-powered lessons.

## Features

- **Page 1 (/)**: Generate Lessons Page
  - Simple form with text area for lesson outline
  - Configure grade level, sections, learning style
  - **NEW:** AI-generated images (1-2 images) for visual learners
  - Generate button to create new lessons
  - Table showing lesson titles, statuses (generating/generated), and access links

- **Page 2 (/lessons/[id])**: View Lesson Page
  - Displays the full lesson content with AI-generated images
  - Shows lesson metadata and status
  - Dynamic TypeScript-based rendering
  - Interactive media elements

## Setup Instructions

### 1. Database Setup

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  outline TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'generated', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- Enable Row Level Security (RLS)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to access all lessons
CREATE POLICY "Allow service role to access lessons" ON lessons
  FOR ALL USING (true);

-- Create lesson_traces table for tracking lesson generation
CREATE TABLE IF NOT EXISTS lesson_traces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  request_data JSONB NOT NULL,
  response_data JSONB,
  provider_used TEXT,
  fallback_providers TEXT[],
  total_duration_ms INTEGER,
  llm_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for lesson_traces
CREATE INDEX IF NOT EXISTS idx_lesson_traces_lesson_id ON lesson_traces(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_traces_created_at ON lesson_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_traces_status ON lesson_traces(status);
CREATE INDEX IF NOT EXISTS idx_lesson_traces_provider ON lesson_traces(provider_used);

-- Enable RLS for lesson_traces
ALTER TABLE lesson_traces ENABLE ROW LEVEL SECURITY;

-- Create policy for lesson_traces
CREATE POLICY "Allow all operations on lesson_traces" ON lesson_traces
  FOR ALL USING (true);
```

### 2. Environment Variables

**IMPORTANT**: You need to create a `.env.local` file in your project root with your Supabase credentials.

Create a file called `.env.local` in the project root with the following content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**How to get these values:**

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Go to Settings → API
4. Copy the "Project URL", "Project API keys" → "anon public" key, and "Project API keys" → "service_role" key
5. Replace the placeholder values in your `.env.local` file

**Example:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODc2ODAwMCwiZXhwIjoyMDE0MzQ0MDAwfQ.example_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk4NzY4MDAwLCJleHAiOjIwMTQzNDQwMDB9.example_service_key_here
```

**⚠️ Without these environment variables, the application will not work!**

**For Image Generation (Optional but Recommended):**

**Image generation now supports 3 providers with automatic fallback:**

1. **Pollinations.ai** (FREE, no API key required) ⭐ **RECOMMENDED**
2. **ImageRouter.io** (optional, requires API key)
3. **Hugging Face** (optional, FREE API)

Add to your `.env.local` (all optional):
```bash
# Image Generation Providers (in priority order)
# 1. Pollinations.ai - Works out of the box (no key needed!)
# 2. ImageRouter.io - Optional, for additional reliability
IMAGEROUTERIO_API_KEY=your_imagerouter_api_key
# 3. Hugging Face - Optional, FREE with generous limits
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

**✨ Quick Start - No API Key Needed!**
Image generation works immediately with Pollinations.ai - no configuration required!

**Optional: Add More Providers**

**ImageRouter.io (for production reliability):**
1. Sign up at https://imagerouter.io/
2. Get your API key from the dashboard
3. Add `IMAGEROUTERIO_API_KEY` to `.env.local`

**Hugging Face (FREE with Stable Diffusion):**
1. Go to https://huggingface.co/join and create a free account
2. Go to Settings → Access Tokens: https://huggingface.co/settings/tokens
3. Click "New token" → Name it (e.g., "lesson-ai") → Select "read" role
4. Add `HUGGINGFACE_API_KEY` to `.env.local`

> **Note:** Image generation works without any API keys using Pollinations.ai! Add additional providers for fallback reliability. See MULTI_PROVIDER_IMAGE_GENERATION.md for details.

### 3. Install Dependencies

```bash
npm install
# or
bun install
```

### 4. Run the Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

**Note**: The application now works without user authentication. You can directly access the lesson generation interface.

## How It Works

1. **Lesson Generation**: When you submit a lesson outline, the system:
   - Creates a new lesson record with "generating" status
   - Starts a background process to generate lesson content
   - **NEW:** If "Reading and Visual" is selected, generates AI images in parallel
   - Updates the status to "generated" when complete

2. **Image Generation** (for visual learners):
   - Select "Reading and Visual" learning style
   - Choose number of images (1 or 2)
   - Images are automatically generated from lesson key concepts
   - Stored in Supabase Storage for fast delivery
   - Displayed inline with lesson content

3. **Real-time Updates**: The main page polls for updates every 2 seconds to show when lessons are ready

4. **Lesson Viewing**: Click "View Lesson" on any generated lesson to see the full content with images

## Technical Details

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI with custom styling
- **State Management**: React hooks (useState, useEffect)

## File Structure

```
app/
├── api/lessons/
│   ├── route.ts          # GET (list lessons), POST (create lesson)
│   └── [id]/route.ts     # GET (fetch specific lesson)
├── lessons/[id]/
│   └── page.tsx          # Lesson view page
└── page.tsx              # Main page with generation form

components/
├── lesson-generation-form.tsx  # Form for creating lessons
└── lessons-table.tsx           # Table displaying lessons

schema.sql                       # Database schema
```

## Troubleshooting

### Common Issues

1. **"Your project's URL and Key are required to create a Supabase client!"**
   - Make sure you've created a `.env.local` file in the project root
   - Verify that the environment variables are correctly set
   - Restart your development server after adding environment variables

2. **Database connection errors**
   - Ensure you've run the SQL schema in your Supabase project
   - Check that your Supabase project is active and not paused
   - Verify your API keys are correct

3. **Lessons not generating**
   - Check the browser console for errors
   - Verify the database table was created correctly
   - Ensure the API routes are working (check Network tab in browser dev tools)

4. **Environment variables not loading**
   - Make sure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
   - Restart your development server
   - Check that there are no spaces around the `=` sign in your environment variables

5. **Images not generating**
   - Images should work out-of-the-box with Pollinations.ai (no API key needed)
   - Optional: Add `IMAGEROUTERIO_API_KEY` or `HUGGINGFACE_API_KEY` for additional providers
   - Create Supabase Storage bucket: `lesson-generated-images` (see IMAGE_GENERATION_SETUP.md)
   - Make the bucket public in Supabase Storage settings
   - Run the migration: `migrations/add-image-generation.sql`
   - Check logs to see which providers are being used
   - Check server logs for detailed error messages
   - Note: Free tier models may take 10-30 seconds if they need to "warm up"

## Image Generation Setup

For complete image generation setup, see **[IMAGE_GENERATION_SETUP.md](./IMAGE_GENERATION_SETUP.md)**

Quick setup:
1. **No API key needed!** Pollinations.ai works out of the box
2. (Optional) Add `IMAGEROUTERIO_API_KEY` or `HUGGINGFACE_API_KEY` for additional providers
3. Run migration: `migrations/add-image-generation.sql`
4. Create storage bucket in Supabase Dashboard:
   - Name: `lesson-generated-images`
5. See MULTI_PROVIDER_IMAGE_GENERATION.md for provider details
   - Make it public
   - Set 10MB file size limit
5. Test by selecting "Reading and Visual" with 1-2 images

**Uses FREE Stable Diffusion models from Hugging Face!**

## Customization

- **Lesson Generation**: The current implementation uses a simple mock generator. You can replace the `generateLessonFromOutline` function in `/app/api/lessons/route.ts` with actual AI service integration (OpenAI, Anthropic, etc.)
- **Styling**: Modify the Tailwind classes in components to change the appearance
- **Database**: Adjust the schema in `schema.sql` to add more fields or constraints
