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

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- Enable Row Level Security (RLS)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on lessons" ON lessons
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
