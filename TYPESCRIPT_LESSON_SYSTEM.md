# TypeScript Lesson Generation System

## 🎯 Overview

This system automatically converts LLM-generated lessons into **editable TypeScript components** that can be dynamically rendered with full support for:

- ✅ **Section Management** - Add, edit, remove lesson sections
- ✅ **Media Integration** - Images and SVGs with positioning
- ✅ **Real-time Editing** - Click-to-edit functionality
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Configurability** - Customize every aspect of the lesson

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TYPESCRIPT LESSON FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. LLM Generation (Markdown)                                │
│     │                                                         │
│     ▼                                                         │
│  2. Parse Markdown → Structured JSON                         │
│     │                                                         │
│     ▼                                                         │
│  3. Generate TypeScript Component                            │
│     │                                                         │
│     ▼                                                         │
│  4. Compile to JavaScript                                    │
│     │                                                         │
│     ▼                                                         │
│  5. Store in Database (TypeScript + JavaScript + Structure)  │
│     │                                                         │
│     ▼                                                         │
│  6. Dynamic Rendering with Editing Capabilities              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Structure

### Lesson Structure
```typescript
interface LessonStructure {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  sections: LessonSection[];
  media: LessonMedia[];
  metadata: {
    difficulty?: string;
    duration?: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };
}
```

### Section Types
```typescript
interface LessonSection {
  id: string;
  type: 'text' | 'code' | 'image' | 'svg' | 'exercise' | 'callout' | 'list' | 'table';
  title?: string;
  content: string;
  metadata?: Record<string, any>;
  editable?: boolean;
  order: number;
}
```

### Media Support
```typescript
interface LessonMedia {
  id: string;
  type: 'image' | 'svg';
  url?: string;
  svgContent?: string;
  alt: string;
  caption?: string;
  position: 'inline' | 'float-left' | 'float-right' | 'full-width';
}
```

## 🚀 Usage

### 1. Generate Lesson from LLM

```typescript
// In your API route (app/api/lessons/route.ts)
const generatedContent = await generateLessonWithLLM(options);

// Parse markdown to structure
const lessonStructure = parseMarkdownToStructure(generatedContent, lessonId);

// Generate TypeScript component
const result = generateLessonTypeScriptComponent(lessonStructure);

// Store in database
await supabase.from('lessons').update({
  content: generatedContent,
  typescript_code: result.tsCode,
  javascript_code: result.jsCode,
  lesson_structure: lessonStructure
});
```

### 2. Render Dynamic Lesson

```typescript
// In your lesson page (app/lessons/[id]/page.tsx)
import { DynamicLessonRenderer } from '@/components/dynamic-lesson-renderer';

export default function LessonPage({ params }: { params: { id: string } }) {
  return (
    <DynamicLessonRenderer 
      lessonId={params.id}
      editable={true}
      onUpdate={(updatedStructure) => {
        console.log('Lesson updated:', updatedStructure);
      }}
    />
  );
}
```

### 3. Edit Lesson Content

**Inline Editing:**
```typescript
// Click any text section to edit it
<div onClick={() => setEditingSection(section.id)}>
  {section.content}
</div>
```

**Add Media:**
```typescript
const handleMediaAdd = (media: LessonMedia) => {
  // Automatically saves to database
  await fetch(`/api/lessons/${lessonId}/typescript`, {
    method: 'PUT',
    body: JSON.stringify({ lessonStructure: updatedStructure })
  });
};
```

## 🎨 Section Types Explained

### 1. Text Section
Regular paragraphs of text
```markdown
## Introduction
This is a text section with multiple paragraphs.

It can span multiple lines.
```

### 2. Code Section
Syntax-highlighted code blocks
```markdown
```javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
```

### 3. List Section
Ordered or unordered lists
```markdown
- Item 1
- Item 2
- Item 3
```

### 4. Callout Section
Highlighted important information
```markdown
> **Important:** This is a critical concept to understand.
```

### 5. Exercise Section
Interactive exercises for learners
```markdown
### Exercise 1
Try implementing the following function...
```

## 🖼️ Adding Media

### Add Image via UI
```typescript
// Click "Add Image" button
1. Enter image URL: https://example.com/image.jpg
2. Enter alt text: Example diagram
3. Enter caption (optional): Figure 1: System architecture
```

### Add SVG via UI
```typescript
// Click "Add SVG" button
1. Paste SVG content: <svg>...</svg>
2. Enter alt text: Flow diagram
3. Enter caption (optional): Process flow
```

### Programmatic Media Addition
```typescript
import { addMediaToLesson } from '@/lib/lesson-typescript-generator';

const newMedia: LessonMedia = {
  id: 'image-1',
  type: 'image',
  url: 'https://example.com/image.jpg',
  alt: 'Example',
  caption: 'Figure 1',
  position: 'full-width'
};

const updatedLesson = addMediaToLesson(lessonStructure, newMedia);
```

## 🔧 Configuration Options

### Media Positioning
```typescript
type MediaPosition = 
  | 'inline'       // Center, full column width
  | 'float-left'   // Left-aligned with text wrap
  | 'float-right'  // Right-aligned with text wrap
  | 'full-width';  // Spans entire width
```

### Section Ordering
```typescript
// Reorder sections
const reorderedSections = lessonStructure.sections
  .sort((a, b) => a.order - b.order);

// Update order
section.order = newOrder;
```

### Custom Metadata
```typescript
// Add custom metadata to sections
section.metadata = {
  difficulty: 'advanced',
  estimatedTime: 15,
  prerequisites: ['section-1', 'section-2'],
  tags: ['algorithm', 'optimization']
};
```

## 📡 API Endpoints

### GET /api/lessons/[id]/typescript
Generates TypeScript component from lesson content

**Response:**
```json
{
  "success": true,
  "lessonStructure": { /* ... */ },
  "typescript": "const Lesson_123 = () => { /* ... */ }",
  "javascript": "const Lesson_123 = () => { /* ... */ }"
}
```

### PUT /api/lessons/[id]/typescript
Updates lesson structure and regenerates TypeScript

**Request:**
```json
{
  "lessonStructure": {
    "id": "123",
    "title": "Updated Title",
    "sections": [ /* ... */ ]
  }
}
```

## 🔐 Security Features

All TypeScript generation includes:

✅ **Input Sanitization** - Removes dangerous characters
✅ **Code Validation** - Checks for dangerous patterns
✅ **XSS Prevention** - Escapes HTML in content
✅ **Type Safety** - Full TypeScript checking
✅ **Content Security** - SVG sanitization

## 🎓 Best Practices

### 1. Structure Your Lessons
```typescript
// Good lesson structure
{
  sections: [
    { type: 'text', title: 'Introduction', order: 0 },
    { type: 'code', title: 'Example', order: 1 },
    { type: 'exercise', title: 'Practice', order: 2 },
    { type: 'text', title: 'Summary', order: 3 }
  ]
}
```

### 2. Use Appropriate Media
```typescript
// Image for diagrams/screenshots
{ type: 'image', url: '...', position: 'full-width' }

// SVG for interactive diagrams
{ type: 'svg', svgContent: '<svg>...</svg>', position: 'inline' }
```

### 3. Add Rich Metadata
```typescript
metadata: {
  difficulty: 'intermediate',
  duration: 30,
  tags: ['react', 'typescript', 'hooks'],
  prerequisites: ['basic-javascript'],
  learningObjectives: [
    'Understand React Hooks',
    'Implement custom hooks',
    'Debug common issues'
  ]
}
```

### 4. Make Content Editable
```typescript
// Enable editing for admin users
<DynamicLessonRenderer 
  lessonId={id}
  editable={user.role === 'admin'}
  onUpdate={handleUpdate}
/>
```

## 🔄 Workflow Example

### Complete Flow from LLM to Editable Lesson

```typescript
// 1. Generate lesson with LLM
const outline = "Introduction to TypeScript";
const llmContent = await generateLessonWithLLM({ outline });

// 2. Parse to structure
const structure = parseMarkdownToStructure(llmContent, lessonId);

// 3. Generate TypeScript
const { tsCode, jsCode } = generateLessonTypeScriptComponent(structure);

// 4. Save to database
await supabase.from('lessons').insert({
  id: lessonId,
  title: structure.title,
  content: llmContent,
  typescript_code: tsCode,
  javascript_code: jsCode,
  lesson_structure: structure
});

// 5. Render with editing
<DynamicLessonRenderer 
  lessonId={lessonId}
  editable={true}
  onUpdate={async (updated) => {
    await fetch(`/api/lessons/${lessonId}/typescript`, {
      method: 'PUT',
      body: JSON.stringify({ lessonStructure: updated })
    });
  }}
/>

// 6. User edits content
// - Click on text to edit
// - Add images via button
// - Reorder sections
// - Add/remove media

// 7. Changes automatically saved
// - TypeScript regenerated
// - Database updated
// - UI refreshed
```

## 🧪 Testing

```typescript
// Test markdown parsing
const markdown = `
# Test Lesson

## Section 1
Content here

\`\`\`javascript
const test = true;
\`\`\`
`;

const structure = parseMarkdownToStructure(markdown, 'test-id');
console.log(structure.sections); // Should have 2 sections

// Test TypeScript generation
const result = generateLessonTypeScriptComponent(structure);
console.log(result.success); // Should be true
console.log(result.tsCode); // Should contain valid TypeScript
```

## 📈 Performance Considerations

- **Caching**: TypeScript generation is cached in database
- **Lazy Loading**: Media loaded on demand
- **Code Splitting**: Dynamic imports for large lessons
- **Memoization**: React components memoized for performance

## 🚀 Production Deployment

### Database Migration
```bash
# Run the schema migration
psql -d your_database -f schema-typescript-lessons.sql
```

### Environment Setup
```env
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
```

### Build and Deploy
```bash
# Build the application
npm run build

# Deploy to Vercel/your platform
vercel deploy --prod
```

## 📚 Advanced Features

### Custom Section Types
```typescript
// Create custom section renderer
const renderCustomSection = (section: LessonSection) => {
  if (section.type === 'quiz') {
    return <QuizComponent questions={section.metadata.questions} />;
  }
  // ... other types
};
```

### Export to Different Formats
```typescript
// Export to markdown
const markdown = convertStructureToMarkdown(lessonStructure);

// Export to PDF (via markdown)
const pdf = await generatePDF(markdown);

// Export to SCORM (for LMS)
const scorm = await generateSCORM(lessonStructure);
```

## 🎉 Benefits

✅ **Dynamic Content** - Lessons are fully editable
✅ **Type Safety** - TypeScript ensures correctness
✅ **SEO-Friendly** - Server-rendered content
✅ **Performance** - Optimized rendering
✅ **Flexibility** - Easy to extend and customize
✅ **Security** - Built-in XSS protection
✅ **Scalability** - Handles large lessons efficiently

## 🤝 Contributing

To extend the system:

1. Add new section types in `LessonSection` interface
2. Implement renderer in `DynamicLessonRenderer`
3. Update TypeScript generator template
4. Add tests for new functionality

## 📝 License

This system is part of the Lesson AI project.

