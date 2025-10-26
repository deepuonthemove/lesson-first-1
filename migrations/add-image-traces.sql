-- Create image_traces table for tracking image generation
CREATE TABLE IF NOT EXISTS image_traces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  request_data JSONB NOT NULL,
  response_data JSONB,
  models_tried TEXT[],
  model_used TEXT,
  total_duration_ms INTEGER,
  image_generation_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for image_traces
CREATE INDEX IF NOT EXISTS idx_image_traces_lesson_id ON image_traces(lesson_id);
CREATE INDEX IF NOT EXISTS idx_image_traces_created_at ON image_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_traces_status ON image_traces(status);
CREATE INDEX IF NOT EXISTS idx_image_traces_model ON image_traces(model_used);

-- Enable RLS for image_traces
ALTER TABLE image_traces ENABLE ROW LEVEL SECURITY;

-- Create policy for image_traces
CREATE POLICY "Allow all operations on image_traces" ON image_traces
  FOR ALL USING (true);

