# 🔧 Troubleshooting Guide

## Error: 500 Internal Server Error on `/api/lessons/[id]/typescript`

### Quick Fix Steps

#### **Step 1: Check Database Schema**

Make sure you've run the database migration:

```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS typescript_code TEXT;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS javascript_code TEXT;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_structure JSONB;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

**Verify columns exist:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lessons'
ORDER BY ordinal_position;
```

You should see:
- `typescript_code` (TEXT)
- `javascript_code` (TEXT)
- `lesson_structure` (JSONB)
- `updated_at` (TIMESTAMPTZ)

#### **Step 2: Check Server Console**

Look at your Next.js server console for detailed error messages. The updated code now logs:

```
Parsing markdown to structure for lesson: [id]
Generating TypeScript component, sections: [count]
Saving TypeScript to database
```

Or errors like:
```
Lesson fetch error: [details]
TypeScript generation failed: [errors]
Database update error: [details]
```

#### **Step 3: Check Browser Console**

Open browser DevTools console and look for:

```javascript
// Success
Lesson structure loaded: { id, title, sections, ... }

// Error
API Error: { error, message, details, stack }
```

#### **Step 4: Test API Endpoint Directly**

```bash
# Test the endpoint directly
curl http://localhost:3000/api/lessons/YOUR_LESSON_ID/typescript

# Should return JSON with:
# - success: true
# - lessonStructure: { ... }
# - typescript: "const Lesson_..."
```

### Common Issues & Solutions

#### **Issue 1: Database columns don't exist**

**Error:** `column "lesson_structure" does not exist`

**Solution:**
```sql
-- Run the full migration
-- Copy from schema-typescript-lessons.sql
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_structure JSONB;
-- ... other columns
```

#### **Issue 2: Old lesson has no content**

**Error:** `Lesson has no content to convert`

**Solution:**
- This lesson was created before content was added
- Delete it and create a new one
- Or manually add content to the lesson

#### **Issue 3: TypeScript generation fails**

**Error:** `Failed to generate TypeScript`

**Check server console for details:**
```
TypeScript generation failed: ["Dangerous pattern detected: ..."]
```

**Solution:**
- Check if lesson content has dangerous patterns
- Review `lib/secure-typescript-utils.ts` validation rules
- Might need to relax some security rules for generated content

#### **Issue 4: Database permissions**

**Error:** `permission denied for table lessons`

**Solution:**
```sql
-- Grant necessary permissions
GRANT ALL ON lessons TO your_service_role;
```

### Step-by-Step Debugging

#### **1. Verify Database Setup**

```sql
-- Check if lesson exists
SELECT id, title, status, 
       content IS NOT NULL as has_content,
       lesson_structure IS NOT NULL as has_structure
FROM lessons
WHERE id = 'YOUR_LESSON_ID';
```

Expected result:
```
id              | title          | status    | has_content | has_structure
----------------|----------------|-----------|-------------|---------------
YOUR_LESSON_ID  | Some Title     | generated | true        | false or true
```

#### **2. Test Markdown Parsing**

Create a test file to verify parsing works:

```typescript
// test-parsing.ts
import { parseMarkdownToStructure } from './lib/lesson-typescript-generator';

const markdown = `
# Test Lesson

## Introduction
This is a test lesson.

## Code Example
\`\`\`javascript
console.log('Hello');
\`\`\`
`;

const result = parseMarkdownToStructure(markdown, 'test-id');
console.log('Parsed structure:', JSON.stringify(result, null, 2));
```

Run: `npx ts-node test-parsing.ts`

#### **3. Test TypeScript Generation**

```typescript
// test-generation.ts
import { generateLessonTypeScriptComponent, parseMarkdownToStructure } from './lib/lesson-typescript-generator';

const markdown = `# Test\n\nContent here`;
const structure = parseMarkdownToStructure(markdown, 'test');
const result = generateLessonTypeScriptComponent(structure);

console.log('Success:', result.success);
console.log('Errors:', result.errors);
console.log('TypeScript length:', result.tsCode?.length);
```

#### **4. Check Supabase Connection**

```typescript
// In your API route or test file
const supabase = createServiceClient();
const { data, error } = await supabase.from('lessons').select('count');
console.log('Connection test:', { data, error });
```

### Manual Workaround

If you need to manually generate TypeScript for an existing lesson:

```sql
-- Find lessons without TypeScript
SELECT id, title 
FROM lessons 
WHERE status = 'generated' 
  AND lesson_structure IS NULL;
```

Then visit each lesson page - the API will automatically generate the TypeScript on first load!

### Enable Development Mode Logging

Update your `.env.local`:

```env
NODE_ENV=development
NEXT_PUBLIC_LOG_LEVEL=debug
```

This will show stack traces in API errors.

### Quick Health Check

Run this to verify everything is working:

```bash
# 1. Check database
psql -d your_db -c "SELECT COUNT(*) FROM lessons WHERE lesson_structure IS NOT NULL"

# 2. Check API
curl -I http://localhost:3000/api/lessons

# 3. Check TypeScript generation
curl http://localhost:3000/api/lessons/SOME_ID/typescript | jq .
```

### Still Having Issues?

1. **Check Server Logs:**
   ```bash
   # Look at Next.js development server output
   npm run dev
   # Check for any startup errors
   ```

2. **Verify File Permissions:**
   ```bash
   ls -la lib/lesson-typescript-generator.ts
   ls -la app/api/lessons/[id]/typescript/route.ts
   ```

3. **Clear Next.js Cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Check Node Version:**
   ```bash
   node --version  # Should be >= 18
   ```

### Get Detailed Error Info

Temporarily add this to your API route for maximum debugging:

```typescript
export async function GET(request, { params }) {
  console.log('=== START DEBUG ===');
  console.log('Request URL:', request.url);
  console.log('Params:', params);
  
  try {
    const { id } = await params;
    console.log('Lesson ID:', id);
    
    const supabase = createServiceClient();
    console.log('Supabase client created');
    
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();
    
    console.log('Lesson fetch result:', { 
      found: !!lesson, 
      error: error?.message,
      hasContent: !!lesson?.content,
      hasStructure: !!lesson?.lesson_structure 
    });
    
    // ... rest of code
  } catch (err) {
    console.error('=== ERROR ===', err);
    console.error('Stack:', err.stack);
    throw err;
  }
}
```

### Contact Points

If none of this works:

1. Check the server console output (where `npm run dev` is running)
2. Check browser console (F12 → Console tab)
3. Check Supabase dashboard logs
4. Review the exact error message and stack trace

The logs should now give you the exact error!

