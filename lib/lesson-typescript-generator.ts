/**
 * Lesson TypeScript Generator
 * Converts LLM-generated markdown lessons into editable TypeScript components
 */

import { sanitizeInput, validateGeneratedCode } from './secure-typescript-utils';
import { safeTranspile, createSecureTypeScriptConfig } from './secure-typescript-loader';

// Lesson structure interfaces
export interface LessonSection {
  id: string;
  type: 'text' | 'code' | 'image' | 'svg' | 'exercise' | 'callout' | 'list' | 'table';
  title?: string;
  content: string;
  metadata?: Record<string, any>;
  editable?: boolean;
  order: number;
}

export interface LessonMedia {
  id: string;
  type: 'image' | 'svg';
  url?: string;
  svgContent?: string;
  alt: string;
  caption?: string;
  position: 'inline' | 'float-left' | 'float-right' | 'full-width';
}

export interface LessonStructure {
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
    imageGenerationFailed?: boolean;
    imageGenerationError?: string;
    [key: string]: any; // Allow additional metadata fields
  };
}

/**
 * Parses markdown content from LLM into structured lesson format
 */
export function parseMarkdownToStructure(markdownContent: string, lessonId: string): LessonStructure {
  const lines = markdownContent.split('\n');
  const sections: LessonSection[] = [];
  const media: LessonMedia[] = [];
  
  let currentSection: Partial<LessonSection> | null = null;
  let sectionOrder = 0;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';

  // Extract title (first H1)
  const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Untitled Lesson';

  // Extract subtitle (first H2 or paragraph after title)
  const subtitleMatch = markdownContent.match(/^##\s+(.+)$/m);
  const subtitle = subtitleMatch ? subtitleMatch[1] : undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Starting code block
        inCodeBlock = true;
        codeBlockLanguage = line.substring(3).trim() || 'plaintext';
        codeBlockContent = [];
      } else {
        // Ending code block
        inCodeBlock = false;
        sections.push({
          id: `code-${sectionOrder}`,
          type: 'code',
          content: codeBlockContent.join('\n'),
          metadata: { language: codeBlockLanguage },
          editable: true,
          order: sectionOrder++
        });
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle headings (sections)
    if (line.startsWith('##')) {
      if (currentSection && currentSection.content) {
        sections.push({
          id: `section-${sectionOrder}`,
          type: currentSection.type || 'text',
          title: currentSection.title,
          content: currentSection.content.trim(),
          editable: true,
          order: sectionOrder++
        });
      }

      currentSection = {
        title: line.replace(/^#+\s+/, ''),
        content: '',
        type: 'text'
      };
      continue;
    }

    // Handle images
    if (line.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
      const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        media.push({
          id: `image-${media.length}`,
          type: 'image',
          url: match[2],
          alt: match[1],
          position: 'inline'
        });

        // Add reference in section
        if (currentSection) {
          currentSection.content += `\n[IMAGE:image-${media.length - 1}]\n`;
        }
      }
      continue;
    }

    // Handle lists
    if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
      if (!currentSection || currentSection.type !== 'list') {
        if (currentSection && currentSection.content) {
          sections.push({
            id: `section-${sectionOrder}`,
            type: currentSection.type || 'text',
            title: currentSection.title,
            content: currentSection.content.trim(),
            editable: true,
            order: sectionOrder++
          });
        }

        currentSection = {
          type: 'list',
          content: '',
          metadata: { listType: line.match(/^\d+\./) ? 'ordered' : 'unordered' }
        };
      }
    }

    // Accumulate content
    if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  // Add final section
  if (currentSection && currentSection.content) {
    sections.push({
      id: `section-${sectionOrder}`,
      type: currentSection.type || 'text',
      title: currentSection.title,
      content: currentSection.content.trim(),
      editable: true,
      order: sectionOrder++
    });
  }

  return {
    id: lessonId,
    title,
    subtitle,
    sections,
    media,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generates TypeScript component from lesson structure
 */
export function generateLessonTypeScriptComponent(
  lessonStructure: LessonStructure
): { success: boolean; tsCode?: string; jsCode?: string; errors?: string[] } {
  try {
    const componentName = `Lesson_${lessonStructure.id.replace(/-/g, '_')}`;
    
    // Generate TypeScript code
    const tsCode = `
import React, { useState } from 'react';

// Lesson interfaces
interface LessonSection {
  id: string;
  type: 'text' | 'code' | 'image' | 'svg' | 'exercise' | 'callout' | 'list' | 'table';
  title?: string;
  content: string;
  metadata?: Record<string, any>;
  editable?: boolean;
  order: number;
}

interface LessonMedia {
  id: string;
  type: 'image' | 'svg';
  url?: string;
  svgContent?: string;
  alt: string;
  caption?: string;
  position: 'inline' | 'float-left' | 'float-right' | 'full-width';
}

interface ${componentName}Props {
  onSectionUpdate?: (sectionId: string, newContent: string) => void;
  onMediaAdd?: (media: LessonMedia) => void;
  onMediaRemove?: (mediaId: string) => void;
  editable?: boolean;
}

const ${componentName}: React.FC<${componentName}Props> = ({
  onSectionUpdate,
  onMediaAdd,
  onMediaRemove,
  editable = false
}) => {
  // Lesson data
  const lessonData = ${JSON.stringify(lessonStructure, null, 2)};
  
  const [sections, setSections] = useState<LessonSection[]>(lessonData.sections);
  const [media, setMedia] = useState<LessonMedia[]>(lessonData.media);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Handle section content update
  const handleSectionUpdate = (sectionId: string, newContent: string) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, content: newContent }
          : section
      )
    );
    
    if (onSectionUpdate) {
      onSectionUpdate(sectionId, newContent);
    }
  };

  // Handle media addition
  const handleMediaAdd = (newMedia: LessonMedia) => {
    setMedia(prev => [...prev, newMedia]);
    
    if (onMediaAdd) {
      onMediaAdd(newMedia);
    }
  };

  // Handle media removal
  const handleMediaRemove = (mediaId: string) => {
    setMedia(prev => prev.filter(m => m.id !== mediaId));
    
    if (onMediaRemove) {
      onMediaRemove(mediaId);
    }
  };

  // Render section based on type
  const renderSection = (section: LessonSection) => {
    const isEditing = editingSection === section.id && editable;

    switch (section.type) {
      case 'text':
        return (
          <div key={section.id} className="lesson-section text-section">
            {section.title && (
              <h3 className="text-2xl font-semibold mb-4">{section.title}</h3>
            )}
            {isEditing ? (
              <textarea
                value={section.content}
                onChange={(e) => handleSectionUpdate(section.id, e.target.value)}
                onBlur={() => setEditingSection(null)}
                className="w-full p-4 border rounded min-h-32"
                autoFocus
              />
            ) : (
              <div 
                className="prose max-w-none"
                onClick={() => editable && setEditingSection(section.id)}
              >
                {section.content.split('\\n').map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div key={section.id} className="lesson-section code-section my-6">
            {section.title && (
              <h4 className="text-lg font-medium mb-2">{section.title}</h4>
            )}
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className={\`language-\${section.metadata?.language || 'plaintext'}\`}>
                {section.content}
              </code>
            </pre>
          </div>
        );

      case 'list':
        const ListTag = section.metadata?.listType === 'ordered' ? 'ol' : 'ul';
        const listItems = section.content.split('\\n').filter(line => line.trim());
        
        return (
          <div key={section.id} className="lesson-section list-section my-4">
            {section.title && (
              <h4 className="text-lg font-medium mb-2">{section.title}</h4>
            )}
            <ListTag className="list-disc ml-6 space-y-2">
              {listItems.map((item, idx) => (
                <li key={idx}>
                  {item.replace(/^[-*]\\s+|\\d+\\.\\s+/, '')}
                </li>
              ))}
            </ListTag>
          </div>
        );

      case 'callout':
        return (
          <div key={section.id} className="lesson-section callout-section my-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              {section.title && (
                <h4 className="text-lg font-semibold text-blue-900 mb-2">
                  {section.title}
                </h4>
              )}
              <p className="text-blue-800">{section.content}</p>
            </div>
          </div>
        );

      default:
        return (
          <div key={section.id} className="lesson-section">
            <p>{section.content}</p>
          </div>
        );
    }
  };

  // Render media
  const renderMedia = (mediaItem: LessonMedia) => {
    if (mediaItem.type === 'image' && mediaItem.url) {
      return (
        <div 
          key={mediaItem.id} 
          className={\`media-item \${mediaItem.position}\`}
        >
          <img 
            src={mediaItem.url} 
            alt={mediaItem.alt}
            className="max-w-full h-auto rounded-lg shadow-md"
          />
          {mediaItem.caption && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              {mediaItem.caption}
            </p>
          )}
          {editable && (
            <button
              onClick={() => handleMediaRemove(mediaItem.id)}
              className="mt-2 text-red-600 text-sm hover:underline"
            >
              Remove Image
            </button>
          )}
        </div>
      );
    }

    if (mediaItem.type === 'svg' && mediaItem.svgContent) {
      return (
        <div 
          key={mediaItem.id} 
          className={\`media-item \${mediaItem.position}\`}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: mediaItem.svgContent }}
            className="svg-container"
          />
          {mediaItem.caption && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              {mediaItem.caption}
            </p>
          )}
          {editable && (
            <button
              onClick={() => handleMediaRemove(mediaItem.id)}
              className="mt-2 text-red-600 text-sm hover:underline"
            >
              Remove SVG
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="lesson-container max-w-4xl mx-auto px-4 py-8">
      {/* Lesson Header */}
      <header className="lesson-header mb-8">
        <h1 className="text-4xl font-bold mb-2">{lessonData.title}</h1>
        {lessonData.subtitle && (
          <h2 className="text-xl text-gray-600 mb-4">{lessonData.subtitle}</h2>
        )}
        {lessonData.metadata.difficulty && (
          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            {lessonData.metadata.difficulty}
          </span>
        )}
      </header>

      {/* Lesson Content */}
      <div className="lesson-content space-y-6">
        {sections.map(section => {
          // Check if section contains media reference
          const mediaMatch = section.content.match(/\\[IMAGE:([^\\]]+)\\]/);
          if (mediaMatch) {
            const mediaId = mediaMatch[1];
            const mediaItem = media.find(m => m.id === mediaId);
            
            return (
              <React.Fragment key={section.id}>
                {renderSection(section)}
                {mediaItem && renderMedia(mediaItem)}
              </React.Fragment>
            );
          }
          
          return renderSection(section);
        })}
      </div>

      {/* Add Media Button (if editable) */}
      {editable && (
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => {
              const url = prompt('Enter image URL:');
              const alt = prompt('Enter image alt text:');
              if (url && alt) {
                handleMediaAdd({
                  id: \`image-\${Date.now()}\`,
                  type: 'image',
                  url,
                  alt,
                  position: 'inline'
                });
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Image
          </button>
          <button
            onClick={() => {
              const svgContent = prompt('Enter SVG content:');
              const alt = prompt('Enter SVG alt text:');
              if (svgContent && alt) {
                handleMediaAdd({
                  id: \`svg-\${Date.now()}\`,
                  type: 'svg',
                  svgContent,
                  alt,
                  position: 'inline'
                });
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add SVG
          </button>
        </div>
      )}
    </div>
  );
};

export default ${componentName};
`;

    // Validate generated code
    const validation = validateGeneratedCode(tsCode);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Compile to JavaScript
    const config = createSecureTypeScriptConfig();
    const compilation = safeTranspile(tsCode, config);

    if (!compilation.success) {
      return {
        success: false,
        errors: compilation.errors
      };
    }

    return {
      success: true,
      tsCode,
      jsCode: compilation.jsCode
    };

  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message]
    };
  }
}

/**
 * Updates a specific section in the lesson structure
 */
export function updateLessonSection(
  lessonStructure: LessonStructure,
  sectionId: string,
  newContent: string
): LessonStructure {
  return {
    ...lessonStructure,
    sections: lessonStructure.sections.map(section =>
      section.id === sectionId
        ? { ...section, content: newContent }
        : section
    ),
    metadata: {
      ...lessonStructure.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Adds media to the lesson structure
 */
export function addMediaToLesson(
  lessonStructure: LessonStructure,
  media: LessonMedia
): LessonStructure {
  return {
    ...lessonStructure,
    media: [...lessonStructure.media, media],
    metadata: {
      ...lessonStructure.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Removes media from the lesson structure
 */
export function removeMediaFromLesson(
  lessonStructure: LessonStructure,
  mediaId: string
): LessonStructure {
  return {
    ...lessonStructure,
    media: lessonStructure.media.filter(m => m.id !== mediaId),
    metadata: {
      ...lessonStructure.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Converts lesson structure back to markdown
 */
export function convertStructureToMarkdown(lessonStructure: LessonStructure): string {
  let markdown = `# ${lessonStructure.title}\n\n`;
  
  if (lessonStructure.subtitle) {
    markdown += `## ${lessonStructure.subtitle}\n\n`;
  }

  for (const section of lessonStructure.sections.sort((a, b) => a.order - b.order)) {
    if (section.title) {
      markdown += `## ${section.title}\n\n`;
    }

    switch (section.type) {
      case 'code':
        markdown += `\`\`\`${section.metadata?.language || ''}\n${section.content}\n\`\`\`\n\n`;
        break;
      
      case 'list':
        markdown += `${section.content}\n\n`;
        break;
      
      default:
        markdown += `${section.content}\n\n`;
    }

    // Add media if referenced
    const mediaMatch = section.content.match(/\[IMAGE:([^\]]+)\]/);
    if (mediaMatch) {
      const mediaId = mediaMatch[1];
      const mediaItem = lessonStructure.media.find(m => m.id === mediaId);
      if (mediaItem && mediaItem.url) {
        markdown += `![${mediaItem.alt}](${mediaItem.url})\n\n`;
      }
    }
  }

  return markdown;
}

