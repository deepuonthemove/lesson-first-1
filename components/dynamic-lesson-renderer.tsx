"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type LessonStructure, type LessonSection, type LessonMedia } from '@/lib/lesson-typescript-generator';

interface DynamicLessonRendererProps {
  lessonId: string;
  editable?: boolean;
  onUpdate?: (lessonStructure: LessonStructure) => void;
}

/**
 * Dynamic Lesson Renderer
 * Renders TypeScript-generated lessons with full editing capabilities
 */
export function DynamicLessonRenderer({ 
  lessonId, 
  editable = false,
  onUpdate 
}: DynamicLessonRendererProps) {
  const [lessonStructure, setLessonStructure] = useState<LessonStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Fetch TypeScript-generated lesson
  useEffect(() => {
    fetchLessonTypeScript();
  }, [lessonId]);

  const fetchLessonTypeScript = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/${lessonId}/typescript`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to fetch lesson TypeScript');
      }

      const data = await response.json();
      console.log('Lesson structure loaded:', data.lessonStructure);
      setLessonStructure(data.lessonStructure);
    } catch (err) {
      console.error('Fetch error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Update section content
  const handleSectionUpdate = async (sectionId: string, newContent: string) => {
    if (!lessonStructure) return;

    const updatedStructure = {
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

    setLessonStructure(updatedStructure);

    // Persist changes
    if (onUpdate) {
      onUpdate(updatedStructure);
    }

    // Save to server
    try {
      await fetch(`/api/lessons/${lessonId}/typescript`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonStructure: updatedStructure })
      });
    } catch (err) {
      console.error('Failed to save section update:', err);
    }
  };

  // Add media
  const handleMediaAdd = async (media: LessonMedia) => {
    if (!lessonStructure) return;

    const updatedStructure = {
      ...lessonStructure,
      media: [...lessonStructure.media, media],
      metadata: {
        ...lessonStructure.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    setLessonStructure(updatedStructure);

    if (onUpdate) {
      onUpdate(updatedStructure);
    }

    // Save to server
    try {
      await fetch(`/api/lessons/${lessonId}/typescript`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonStructure: updatedStructure })
      });
    } catch (err) {
      console.error('Failed to save media:', err);
    }
  };

  // Remove media
  const handleMediaRemove = async (mediaId: string) => {
    if (!lessonStructure) return;

    const updatedStructure = {
      ...lessonStructure,
      media: lessonStructure.media.filter(m => m.id !== mediaId),
      metadata: {
        ...lessonStructure.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    setLessonStructure(updatedStructure);

    if (onUpdate) {
      onUpdate(updatedStructure);
    }

    // Save to server
    try {
      await fetch(`/api/lessons/${lessonId}/typescript`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonStructure: updatedStructure })
      });
    } catch (err) {
      console.error('Failed to remove media:', err);
    }
  };

  // Render section based on type
  const renderSection = (section: LessonSection) => {
    const isEditing = editingSection === section.id && editable;

    switch (section.type) {
      case 'text':
        return (
          <div key={section.id} className="lesson-section text-section mb-6">
            {section.title && (
              <div className="section-heading-bounding-box">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {section.title}
                </h3>
              </div>
            )}
            {isEditing ? (
              <textarea
                value={section.content}
                onChange={(e) => handleSectionUpdate(section.id, e.target.value)}
                onBlur={() => setEditingSection(null)}
                className="w-full p-4 border border-gray-300 rounded-lg min-h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            ) : (
              <div 
                className={`prose prose-lg max-w-none dark:prose-invert ${editable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded' : ''}`}
                onClick={() => editable && setEditingSection(section.id)}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div key={section.id} className="lesson-section code-section my-6">
            {section.title && (
              <div className="section-heading-bounding-box">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {section.title}
                </h4>
              </div>
            )}
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className={`language-${section.metadata?.language || 'plaintext'}`}>
                {section.content}
              </code>
            </pre>
          </div>
        );

      case 'list':
        return (
          <div key={section.id} className="lesson-section list-section my-4">
            {section.title && (
              <div className="section-heading-bounding-box">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {section.title}
                </h4>
              </div>
            )}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.content}
              </ReactMarkdown>
            </div>
          </div>
        );

      case 'callout':
        return (
          <div key={section.id} className="lesson-section callout-section my-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
              {section.title && (
                <div className="section-heading-bounding-box mb-3">
                  <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {section.title}
                  </h4>
                </div>
              )}
              <div className="prose prose-lg max-w-none dark:prose-invert prose-p:text-blue-800 dark:prose-p:text-blue-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );

      case 'exercise':
        return (
          <div key={section.id} className="lesson-section exercise-section my-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 p-6 rounded-lg">
              {section.title && (
                <div className="section-heading-bounding-box mb-3">
                  <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    📝 {section.title}
                  </h4>
                </div>
              )}
              <div className="prose prose-lg max-w-none dark:prose-invert prose-p:text-green-800 dark:prose-p:text-green-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div key={section.id} className="lesson-section mb-4">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.content}
              </ReactMarkdown>
            </div>
          </div>
        );
    }
  };

  // Render media
  const renderMedia = (mediaItem: LessonMedia) => {
    // Skip rendering if URL is missing or blank
    if (mediaItem.type === 'image' && (!mediaItem.url || mediaItem.url.trim() === '')) {
      return null;
    }
    if (mediaItem.type === 'svg' && (!mediaItem.svgContent || mediaItem.svgContent.trim() === '')) {
      return null;
    }

    // All images display as full-width blocks (no floating)
    const positionClasses = {
      'inline': 'my-8 w-full flex flex-col items-center',
      'float-left': 'my-8 w-full flex flex-col items-center',
      'float-right': 'my-8 w-full flex flex-col items-center',
      'full-width': 'my-8 w-full flex flex-col items-center'
    };

    if (mediaItem.type === 'image' && mediaItem.url) {
      return (
        <div 
          key={mediaItem.id} 
          className={`media-item ${positionClasses[mediaItem.position]} relative group`}
        >
          <img 
            src={mediaItem.url} 
            alt={mediaItem.alt}
            className="max-w-2xl w-full h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          />
          {mediaItem.caption && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center italic">
              {mediaItem.caption}
            </p>
          )}
          {editable && (
            <button
              onClick={() => handleMediaRemove(mediaItem.id)}
              className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕ Remove
            </button>
          )}
        </div>
      );
    }

    if (mediaItem.type === 'svg' && mediaItem.svgContent) {
      return (
        <div 
          key={mediaItem.id} 
          className={`media-item ${positionClasses[mediaItem.position]} relative group`}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: mediaItem.svgContent }}
            className="svg-container max-w-full"
          />
          {mediaItem.caption && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center italic">
              {mediaItem.caption}
            </p>
          )}
          {editable && (
            <button
              onClick={() => handleMediaRemove(mediaItem.id)}
              className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕ Remove
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !lessonStructure) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          {error || 'Failed to load lesson'}
        </p>
        <button
          onClick={fetchLessonTypeScript}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="lesson-container max-w-4xl mx-auto px-4 py-8">
      {/* Outer Bounding Box for Entire Lesson */}
      <div className="lesson-outer-bounding-box">
        {/* Lesson Title and Headings with Inner Bounding Box */}
        <div className="lesson-title-bounding-box">
          <header className="lesson-header">
            <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
              {lessonStructure.title}
            </h1>
            {lessonStructure.subtitle && (
              <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                {lessonStructure.subtitle}
              </h2>
            )}
            <div className="flex gap-2 flex-wrap">
              {lessonStructure.metadata.difficulty && (
                <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-3 py-1 rounded-full text-sm">
                  {lessonStructure.metadata.difficulty}
                </span>
              )}
              {lessonStructure.metadata.duration && (
                <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm">
                  ⏱️ {lessonStructure.metadata.duration} min
                </span>
              )}
              {lessonStructure.metadata.tags?.map(tag => (
                <span 
                  key={tag}
                  className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </header>
        </div>

        {/* Lesson Content */}
        <div className="lesson-content space-y-6">
          {lessonStructure.sections
            .sort((a, b) => a.order - b.order)
            .map(section => {
              // Check if section contains media reference
              const mediaMatch = section.content.match(/\[IMAGE:([^\]]+)\]/);
              if (mediaMatch) {
                const mediaId = mediaMatch[1];
                const mediaItem = lessonStructure.media.find(m => m.id === mediaId);
                
                // Remove the [IMAGE:...] reference from content before rendering
                const sectionWithoutImageRef = {
                  ...section,
                  content: section.content.replace(/\[IMAGE:[^\]]+\]/, '').trim()
                };
                
                // Only render media if it exists and has valid content
                const shouldRenderMedia = mediaItem && (
                  (mediaItem.type === 'image' && mediaItem.url && mediaItem.url.trim() !== '') ||
                  (mediaItem.type === 'svg' && mediaItem.svgContent && mediaItem.svgContent.trim() !== '')
                );
                
                return (
                  <React.Fragment key={section.id}>
                    {renderSection(sectionWithoutImageRef)}
                    {shouldRenderMedia && renderMedia(mediaItem)}
                  </React.Fragment>
                );
              }
              
              return renderSection(section);
            })}
        </div>

        {/* Metadata Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <p>Last updated: {new Date(lessonStructure.metadata.updatedAt).toLocaleString()}</p>
        </footer>
      </div>

      {/* Add Media Buttons (if editable) */}
      {editable && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 flex gap-4 flex-wrap">
          <button
            onClick={() => {
              const url = prompt('Enter image URL:');
              if (!url) return;
              const alt = prompt('Enter image alt text:') || 'Image';
              const caption = prompt('Enter image caption (optional):');
              
              handleMediaAdd({
                id: `image-${Date.now()}`,
                type: 'image',
                url,
                alt,
                caption: caption || undefined,
                position: 'inline'
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🖼️ Add Image
          </button>
          <button
            onClick={() => {
              const svgContent = prompt('Enter SVG content:');
              if (!svgContent) return;
              const alt = prompt('Enter SVG alt text:') || 'SVG';
              const caption = prompt('Enter SVG caption (optional):');
              
              handleMediaAdd({
                id: `svg-${Date.now()}`,
                type: 'svg',
                svgContent,
                alt,
                caption: caption || undefined,
                position: 'inline'
              });
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            ✏️ Add SVG
          </button>
        </div>
      )}
    </div>
  );
}

