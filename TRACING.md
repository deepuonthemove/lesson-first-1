# Lesson Generation Tracing System

This document describes the tracing system implemented to track lesson generation calls with detailed metadata.

## Overview

The tracing system captures:
- Request and response data for each lesson generation
- LLM provider used and fallback providers attempted
- Individual LLM API calls with timing and token usage
- Error messages and failure points
- Total duration and performance metrics

## Database Schema

### lesson_traces Table

```sql
CREATE TABLE lesson_traces (
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
```

## API Endpoints

### GET /api/traces
Fetch all traces with pagination
- Query params: `limit` (default: 50), `offset` (default: 0)

### GET /api/traces/[id]
Fetch a specific trace by ID

### DELETE /api/traces?id=[id]
Delete a specific trace

### DELETE /api/traces?deleteAll=true
Delete all traces

## Tracing Page

Access the tracing interface at `/traces` to:
- View all lesson generation traces
- See detailed information for each trace
- View individual LLM API calls
- Delete individual traces or all traces
- Monitor performance and error rates

## Usage

The tracing system is automatically integrated into the lesson generation flow. When a lesson is generated:

1. A trace is created with the request data
2. Each LLM API call is tracked with timing and response data
3. The trace is updated with the final result
4. All data is stored in the database for later analysis

## Features

- **Automatic Tracing**: No code changes needed in lesson generation
- **Detailed Metadata**: Request/response data, timing, token usage
- **Error Tracking**: Failed calls and error messages
- **Provider Fallback**: Track which providers were attempted
- **Performance Monitoring**: Duration tracking for optimization
- **Clean Interface**: Easy-to-use web interface for viewing traces
- **Bulk Operations**: Delete individual or all traces

## Data Structure

### LLMCall Interface
```typescript
interface LLMCall {
  provider: LLMProvider;
  request: {
    prompt: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  response?: {
    content: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  duration_ms: number;
  success: boolean;
  error?: string;
  timestamp: string;
}
```

### LessonTrace Interface
```typescript
interface LessonTrace {
  id: string;
  lesson_id: string;
  request_data: any;
  response_data?: any;
  provider_used?: string;
  fallback_providers?: string[];
  total_duration_ms?: number;
  llm_calls: LLMCall[];
  error_message?: string;
  status: 'started' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}
```

## Security

- All tracing data is stored in the database with proper RLS policies
- No sensitive API keys are stored in traces
- Traces can be deleted individually or in bulk
- Access is controlled through the same authentication system

## Performance

- Traces are stored asynchronously to avoid impacting lesson generation
- Database indexes are optimized for common queries
- Pagination is supported for large trace datasets
- Old traces can be cleaned up as needed
