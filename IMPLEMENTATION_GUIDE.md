# Implementation Guide: TypeScript Lesson System

## 🎯 Quick Start (5 Minutes)

### Step 1: Run Database Migration
```bash
# Connect to your Supabase database and run:
psql -d your_database -f schema-typescript-lessons.sql

# Or via Supabase Dashboard:
# Go to SQL Editor → Paste contents of schema-typescript-lessons.sql → Run
```

### Step 2: Update Lesson Generation API

Update `/app/api/lessons/route.ts`:

```typescript
import { parseMarkdownToStructure, generateLessonTypeScriptComponent } from '@/lib/lesson-typescript-generator';

// In your POST endpoint, after LLM generation:
const generatedContent = await generateLessonWithTracing(options);

// Parse and generate TypeScript
const lessonStructure = parseMarkdownToStructure(generatedContent.content, lesson.id);
const tsResult = generateLessonTypeScriptComponent(lessonStructure);

// Update database with TypeScript code
await supabase
  .from("lessons")
  .update({
    status: "generated",
    content: generatedContent.content,
    title: generatedContent.title,
    typescript_code: tsResult.tsCode,
    javascript_code: tsResult.jsCode,
    lesson_structure: lessonStructure
  })
  .eq("id", lesson.id);
```

### Step 3: Update Lesson View Page

Replace your lesson view page with the dynamic renderer:

```typescript
// app/lessons/[id]/page.tsx
import { DynamicLessonRenderer } from '@/components/dynamic-lesson-renderer';

export default function LessonPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen">
      <DynamicLessonRenderer 
        lessonId={params.id}
        editable={false} // Set to true for admin users
      />
    </main>
  );
}
```

That's it! Your lessons will now be:
✅ Converted to TypeScript
✅ Rendered dynamically
✅ Fully editable (if enabled)
✅ Support images and SVGs

## 🔧 Configuration Options

### Enable Editing for Admins

```typescript
// Check user role (implement your auth logic)
const isAdmin = await checkUserRole(userId);

<DynamicLessonRenderer 
  lessonId={params.id}
  editable={isAdmin}
  onUpdate={async (updatedStructure) => {
    // Optional: Add custom logic when lesson is updated
    console.log('Lesson updated:', updatedStructure);
    
    // Maybe trigger a webhook, send notification, etc.
    await fetch('/api/webhooks/lesson-updated', {
      method: 'POST',
      body: JSON.stringify({ lessonId, updatedStructure })
    });
  }}
/>
```

### Customize LLM Prompt for Better Structure

Update `/lib/llm/prompts.ts`:

```typescript
export const SYSTEM_PROMPT = `You are an expert educational content creator. Generate comprehensive, engaging lesson content based on the provided outline.

Guidelines:
- Create structured, well-organized content with clear sections
- Use appropriate markdown formatting (headers, lists, code blocks, etc.)
- Include practical examples and real-world applications
- Add callouts for important concepts using blockquotes (>)
- Structure exercises clearly with "Exercise:" prefix
- Use code blocks with language specifications for better syntax highlighting
- Suggest places where images/diagrams would be helpful with [IMAGE: description]

Content Structure:
1. Introduction with learning objectives
2. Main content sections with clear explanations
3. Code examples with \`\`\` blocks
4. Exercises for practice
5. Key takeaways and summary

Format the response as complete lesson with proper markdown formatting.`;
```

### Add Custom Section Types

Extend the system with custom section types:

```typescript
// 1. Add new type to interface (lib/lesson-typescript-generator.ts)
export interface LessonSection {
  type: 'text' | 'code' | 'quiz' | 'video' | 'exercise' | 'callout' | 'list';
  // ... rest of interface
}

// 2. Add renderer (components/dynamic-lesson-renderer.tsx)
const renderSection = (section: LessonSection) => {
  switch (section.type) {
    case 'quiz':
      return (
        <QuizSection 
          questions={section.metadata.questions}
          onComplete={(score) => console.log('Quiz score:', score)}
        />
      );
    
    case 'video':
      return (
        <VideoPlayer 
          url={section.metadata.videoUrl}
          transcript={section.content}
        />
      );
    
    // ... other types
  }
};
```

## 🎨 Styling Customization

### Use Your Own CSS Classes

```typescript
// Update DynamicLessonRenderer to accept custom classes
interface DynamicLessonRendererProps {
  lessonId: string;
  editable?: boolean;
  className?: string;
  sectionClassName?: string;
}

// Apply custom styling
<DynamicLessonRenderer 
  lessonId={params.id}
  className="custom-lesson-container"
  sectionClassName="custom-section"
/>
```

### Dark Mode Support

The component already supports dark mode via Tailwind's `dark:` classes. To toggle:

```typescript
// Add theme toggle
import { useTheme } from 'next-themes';

function LessonPage() {
  const { theme, setTheme } = useTheme();
  
  return (
    <>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
      <DynamicLessonRenderer lessonId={id} />
    </>
  );
}
```

## 🖼️ Image and SVG Management

### Using Supabase Storage for Images

```typescript
// Upload image to Supabase Storage
const uploadImage = async (file: File) => {
  const supabase = createClient();
  const fileName = `lessons/${lessonId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('lesson-images')
    .upload(fileName, file);
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('lesson-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

// Use in lesson
const handleImageUpload = async (file: File) => {
  const url = await uploadImage(file);
  
  handleMediaAdd({
    id: `image-${Date.now()}`,
    type: 'image',
    url,
    alt: file.name,
    position: 'inline'
  });
};
```

### Generate SVGs Programmatically

```typescript
// Create SVG diagrams programmatically
const createFlowDiagram = (steps: string[]) => {
  return `
    <svg viewBox="0 0 400 ${steps.length * 100}" xmlns="http://www.w3.org/2000/svg">
      ${steps.map((step, i) => `
        <rect x="50" y="${i * 100 + 20}" width="300" height="60" 
              fill="#3b82f6" rx="8" />
        <text x="200" y="${i * 100 + 55}" text-anchor="middle" 
              fill="white" font-size="16">${step}</text>
        ${i < steps.length - 1 ? `
          <line x1="200" y1="${i * 100 + 80}" x2="200" y2="${i * 100 + 120}" 
                stroke="#3b82f6" stroke-width="2" />
          <polygon points="200,${i * 100 + 115} 195,${i * 100 + 105} 205,${i * 100 + 105}" 
                   fill="#3b82f6" />
        ` : ''}
      `).join('')}
    </svg>
  `;
};

// Add to lesson
const svgContent = createFlowDiagram(['Step 1', 'Step 2', 'Step 3']);
handleMediaAdd({
  id: `svg-${Date.now()}`,
  type: 'svg',
  svgContent,
  alt: 'Process flow diagram',
  position: 'full-width'
});
```

## 🔄 Hybrid Rendering Strategy

### Combine SSR with Client-side Interactivity

```typescript
// app/lessons/[id]/page.tsx
import { createServiceClient } from '@/lib/supabase/server';

// Server-side data fetching
export default async function LessonPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = createServiceClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.id)
    .single();

  // Server-render the initial content
  if (!lesson) {
    return <div>Lesson not found</div>;
  }

  return (
    <main>
      {/* Static header - SEO friendly */}
      <header>
        <h1>{lesson.title}</h1>
        <p>{lesson.metadata?.description}</p>
      </header>
      
      {/* Dynamic, editable content */}
      <DynamicLessonRenderer 
        lessonId={params.id}
        editable={false}
      />
    </main>
  );
}

// Enable ISR for better performance
export const revalidate = 3600; // Revalidate every hour
```

## 📊 Analytics Integration

### Track Lesson Interactions

```typescript
<DynamicLessonRenderer 
  lessonId={params.id}
  onUpdate={(structure) => {
    // Track edit events
    analytics.track('lesson_edited', {
      lessonId: params.id,
      sectionsCount: structure.sections.length,
      mediaCount: structure.media.length
    });
  }}
/>

// Add custom tracking
const trackSectionView = (sectionId: string) => {
  analytics.track('section_viewed', {
    lessonId: params.id,
    sectionId,
    timestamp: new Date()
  });
};
```

## 🧪 Testing

### Unit Tests for Parser

```typescript
// tests/lesson-parser.test.ts
import { parseMarkdownToStructure } from '@/lib/lesson-typescript-generator';

describe('Lesson Parser', () => {
  it('should parse markdown headers', () => {
    const markdown = `
# Main Title
## Section 1
Content here
    `;
    
    const result = parseMarkdownToStructure(markdown, 'test-id');
    expect(result.title).toBe('Main Title');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('Section 1');
  });

  it('should parse code blocks', () => {
    const markdown = `
\`\`\`javascript
const test = true;
\`\`\`
    `;
    
    const result = parseMarkdownToStructure(markdown, 'test-id');
    expect(result.sections[0].type).toBe('code');
    expect(result.sections[0].metadata.language).toBe('javascript');
  });
});
```

### Integration Tests

```typescript
// tests/lesson-api.test.ts
describe('Lesson TypeScript API', () => {
  it('should generate TypeScript from lesson', async () => {
    const response = await fetch('/api/lessons/test-id/typescript');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.typescript).toContain('const Lesson_');
    expect(data.lessonStructure).toBeDefined();
  });
});
```

## 🚀 Performance Optimization

### Lazy Load Media

```typescript
// Use next/image for optimized images
import Image from 'next/image';

const renderMedia = (mediaItem: LessonMedia) => {
  if (mediaItem.type === 'image') {
    return (
      <Image
        src={mediaItem.url}
        alt={mediaItem.alt}
        width={800}
        height={600}
        loading="lazy"
        placeholder="blur"
      />
    );
  }
};
```

### Code Splitting

```typescript
// Dynamic import for heavy components
const QuizComponent = dynamic(() => import('./quiz-component'), {
  loading: () => <div>Loading quiz...</div>,
  ssr: false
});
```

## 🔐 Security Considerations

### Sanitize SVG Content

```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizeSVG = (svgContent: string) => {
  return DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true }
  });
};

// Use in media renderer
<div dangerouslySetInnerHTML={{ 
  __html: sanitizeSVG(mediaItem.svgContent) 
}} />
```

### Validate User Input

```typescript
// Validate section content before saving
const validateSectionContent = (content: string) => {
  // Max length
  if (content.length > 10000) {
    throw new Error('Content too long');
  }
  
  // No dangerous patterns
  const dangerousPatterns = [/<script/i, /javascript:/i, /onerror=/i];
  if (dangerousPatterns.some(pattern => pattern.test(content))) {
    throw new Error('Invalid content');
  }
  
  return true;
};
```

## 📝 Best Practices Summary

✅ **Always sanitize user input**
✅ **Use TypeScript for type safety**
✅ **Enable editing only for authorized users**
✅ **Optimize images and media**
✅ **Use ISR for better performance**
✅ **Track analytics for insights**
✅ **Test thoroughly before deployment**
✅ **Monitor error logs**
✅ **Keep backups of lesson content**
✅ **Version control lesson structures**

## 🆘 Troubleshooting

### Issue: TypeScript compilation fails
**Solution**: Check browser console for errors. Ensure TypeScript compiler is loaded from CDN.

### Issue: Media not displaying
**Solution**: Check CORS settings for image URLs. Verify Supabase storage permissions.

### Issue: Edits not saving
**Solution**: Check API route logs. Verify database permissions and network connectivity.

### Issue: Slow rendering
**Solution**: Enable ISR, optimize images, use code splitting for large lessons.

## 📞 Support

For issues or questions:
1. Check TYPESCRIPT_LESSON_SYSTEM.md for detailed documentation
2. Review implementation examples in the codebase
3. Test with sample lessons first
4. Enable debug logging for troubleshooting

---

**You're all set!** 🎉 Your lessons will now be dynamic, editable TypeScript components.

