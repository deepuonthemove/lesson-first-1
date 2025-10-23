-- Demo User Setup for Lesson AI
-- Run this in your Supabase SQL Editor to create the demo user

-- Create the demo user
-- Note: You can also create this user through the Supabase Auth UI
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@lessonai.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create the lessons table if it doesn't exist
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

-- Create a policy that allows authenticated users to access all lessons
CREATE POLICY "Allow authenticated users to access lessons" ON lessons
  FOR ALL USING (auth.role() = 'authenticated');

-- Alternative: If you want to create the user through the Supabase Dashboard:
-- 1. Go to Authentication > Users in your Supabase dashboard
-- 2. Click "Add user"
-- 3. Enter email: demo@lessonai.com
-- 4. Enter password: demo123
-- 5. Click "Create user"
