# Lesson AI - Setup Instructions

This is a two-page full-stack application that allows you to generate and view AI-powered lessons.

## Features

- **Page 1 (/)**: Generate Lessons Page
  - Simple form with text area for lesson outline
  - Generate button to create new lessons
  - Table showing lesson titles, statuses (generating/generated), and access links

- **Page 2 (/lessons/[id])**: View Lesson Page
  - Displays the full lesson content
  - Shows lesson metadata and status
  - Simple markdown rendering

## Setup Instructions

### 1. Database Setup

Run the following SQL in your Supabase SQL editor to create the required table:

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
   - Updates the status to "generated" when complete

2. **Real-time Updates**: The main page polls for updates every 2 seconds to show when lessons are ready

3. **Lesson Viewing**: Click "View Lesson" on any generated lesson to see the full content

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

## Customization

- **Lesson Generation**: The current implementation uses a simple mock generator. You can replace the `generateLessonFromOutline` function in `/app/api/lessons/route.ts` with actual AI service integration (OpenAI, Anthropic, etc.)
- **Styling**: Modify the Tailwind classes in components to change the appearance
- **Database**: Adjust the schema in `schema.sql` to add more fields or constraints
