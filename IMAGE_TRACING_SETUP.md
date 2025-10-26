# Image Tracing System Setup Guide

## Overview

The image tracing system tracks all image generation requests and responses, similar to the lesson tracing system. It logs:
- Which models were tried
- Success/failure of each attempt
- Request parameters
- Response data (image sizes, errors)
- Total duration
- All prompts used

## Database Setup

Run the migration to create the `image_traces` table:

```sql
-- The migration is located at: migrations/add-image-traces.sql
-- Or use the complete schema at: schema.sql
```

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `migrations/add-image-traces.sql`
4. Click **Run**

The migration creates:
- `image_traces` table
- Indexes for efficient queries
- Row Level Security policies

## Files Created

### 1. Database Migration
- **`migrations/add-image-traces.sql`** - Creates `image_traces` table
- **`schema.sql`** - Updated with image_traces table definition

### 2. Tracing Library
- **`lib/image-tracing.ts`** - ImageTracer class for tracking image generation
  - `startTrace()` - Begins tracking
  - `addImageGenerationAttempt()` - Logs each model attempt
  - `completeTrace()` - Marks successful completion
  - `failTrace()` - Marks failure
  - Static methods for querying traces

### 3. API Routes
- **`app/api/traceImage/route.ts`** - REST API for image traces
  - `GET /api/traceImage` - Fetch traces (with pagination)
  - `DELETE /api/traceImage?id=xxx` - Delete single trace
  - `DELETE /api/traceImage?deleteAll=true` - Delete all traces

### 4. UI Page
- **`app/traceImage/page.tsx`** - Web interface for viewing traces
  - List of all image traces
  - Detailed view of each trace
  - Shows all model attempts with timing
  - Request/response data
  - Success/failure status

### 5. Integration
- **`lib/llm/gemini-image.ts`** - Updated to log all attempts
  - Tracks each Hugging Face model tried
  - Logs request parameters
  - Logs response data (success/failure)
  - Records timing for each attempt
- **`app/api/lessons/route.ts`** - Creates ImageTracer for each lesson

## Usage

### Accessing the UI

Navigate to: **http://localhost:3000/traceImage**

The UI shows:
- All image generation traces
- Status (started/completed/failed)
- Model used
- Duration
- Number of attempts
- Detailed view with all request/response data

### API Usage

```typescript
// Fetch traces
const response = await fetch('/api/traceImage?limit=50&offset=0');
const { traces } = await response.json();

// Delete a trace
await fetch(`/api/traceImage?id=${traceId}`, { method: 'DELETE' });

// Delete all traces
await fetch('/api/traceImage?deleteAll=true', { method: 'DELETE' });
```

### Programmatic Usage

```typescript
import { ImageTracer } from '@/lib/image-tracing';

// Create tracer
const tracer = new ImageTracer(lessonId);

// Start tracking
await tracer.startTrace({
  lessonId,
  numberOfImages: 2,
  prompts: [/* ... */]
});

// Add attempt (automatically called by generateImageWithGemini)
tracer.addImageGenerationAttempt({
  model: 'stabilityai/stable-diffusion-xl-base-1.0',
  prompt: 'A cat playing',
  request: { /* ... */ },
  response: { success: true, dataSize: 212272 },
  duration_ms: 3500,
  success: true
});

// Complete successfully
await tracer.completeTrace({
  generatedImagesCount: 2,
  uploadedImagesCount: 2,
  imageUrls: [/* ... */]
}, 'stabilityai/stable-diffusion-xl-base-1.0');

// Or mark as failed
await tracer.failTrace('Model timeout');
```

## Data Structure

### ImageTrace
```typescript
interface ImageTrace {
  id: string;
  lesson_id: string;
  request_data: any;              // Original request (prompts, config)
  response_data?: any;             // Final response (URLs, counts)
  models_tried?: string[];         // All models attempted
  model_used?: string;             // Successful model
  total_duration_ms?: number;      // Total time
  image_generation_attempts: ImageGenerationAttempt[];
  error_message?: string;
  status: 'started' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}
```

### ImageGenerationAttempt
```typescript
interface ImageGenerationAttempt {
  model: string;                  // e.g., 'stabilityai/stable-diffusion-xl-base-1.0'
  prompt: string;                 // Full prompt sent to model
  request: {
    prompt: string;
    model: string;
    options?: Record<string, any>;
  };
  response?: {
    success: boolean;
    dataSize?: number;            // Size of generated image
    error?: string;
  };
  duration_ms: number;            // Time for this attempt
  success: boolean;
  error?: string;
  timestamp: string;
}
```

## What Gets Logged

For each image generation:
1. **Initial request** - Prompts, lesson ID, configuration
2. **Each model attempt**:
   - Model name
   - Exact prompt sent
   - Request parameters (negative_prompt, guidance_scale, etc.)
   - Response status
   - Error messages (if failed)
   - Duration
3. **Final result**:
   - Which model succeeded
   - All models tried
   - Total duration
   - Generated image URLs
   - Upload success/failure

## Benefits

1. **Debugging** - See exactly which models failed and why
2. **Performance** - Track how long each model takes
3. **Reliability** - Identify which models are most reliable
4. **Optimization** - Determine best model order to try
5. **Monitoring** - Alert on image generation failures
6. **Analytics** - Understand image generation patterns

## Example Trace

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "lesson_id": "lesson-123",
  "status": "completed",
  "model_used": "stabilityai/stable-diffusion-xl-base-1.0",
  "models_tried": [
    "stabilityai/stable-diffusion-xl-base-1.0"
  ],
  "total_duration_ms": 3542,
  "request_data": {
    "numberOfImages": 1,
    "prompts": [
      {
        "prompt": "A cat playing with yarn, educational illustration",
        "position": "full",
        "targetSection": 2
      }
    ]
  },
  "response_data": {
    "generatedImagesCount": 1,
    "uploadedImagesCount": 1,
    "imageUrls": ["https://..."]
  },
  "image_generation_attempts": [
    {
      "model": "stabilityai/stable-diffusion-xl-base-1.0",
      "prompt": "A cat playing with yarn, educational illustration",
      "duration_ms": 3542,
      "success": true,
      "response": {
        "success": true,
        "dataSize": 212272
      }
    }
  ],
  "created_at": "2025-10-26T10:30:00Z",
  "completed_at": "2025-10-26T10:30:03Z"
}
```

## Testing

1. Generate a lesson with images
2. Visit `/traceImage`
3. See the trace with all attempts
4. Click on a trace to view detailed information
5. Check model fallback behavior (when primary model fails)

## Next Steps

- Add filtering by date range
- Add statistics dashboard (success rates, average duration)
- Export traces to CSV/JSON
- Set up alerts for repeated failures
- Add charts showing model performance over time

