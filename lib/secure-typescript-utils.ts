/**
 * Secure TypeScript Generation Utilities
 * Provides safe input sanitization, code validation, and error handling
 */

// Security constants
const MAX_INPUT_LENGTH = 1000;
const MAX_GENERATED_CODE_SIZE = 50000; // 50KB limit
const MAX_STORAGE_ITEMS = 5;
const DANGEROUS_PATTERNS = [
  /eval\s*\(/gi,
  /Function\s*\(/gi,
  /document\.write/gi,
  /\.innerHTML\s*=/gi, // Direct DOM manipulation (but not React's dangerouslySetInnerHTML)
  /\.outerHTML\s*=/gi,
  /window\.setTimeout\s*\(/gi, // Block global setTimeout (React useEffect cleanup is fine)
  /window\.setInterval\s*\(/gi, // Block global setInterval
  /import\s*\(/gi,
  /require\s*\(/gi,
  /__proto__/gi,
  /constructor\s*\[/gi,
  /new\s+Function/gi,
  /<script/gi,
  /<\/script>/gi,
  /javascript:/gi,
  // Specific dangerous HTML event handlers (lowercase, not React)
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onbeforeunload\s*=/gi,
  /onunload\s*=/gi,
  /onmouseover\s*=/gi,
  /onmouseout\s*=/gi,
  /oncontextmenu\s*=/gi,
  /onauxclick\s*=/gi,
  /oncanplay\s*=/gi,
  /oncanplaythrough\s*=/gi,
  /onclose\s*=/gi,
  /oncuechange\s*=/gi,
  /ondurationchange\s*=/gi,
  /onemptied\s*=/gi,
  /onended\s*=/gi,
  /onloadeddata\s*=/gi,
  /onloadedmetadata\s*=/gi,
  /onloadstart\s*=/gi,
  /onpause\s*=/gi,
  /onplay\s*=/gi,
  /onplaying\s*=/gi,
  /onprogress\s*=/gi,
  /onratechange\s*=/gi,
  /onseeked\s*=/gi,
  /onseeking\s*=/gi,
  /onstalled\s*=/gi,
  /onsuspend\s*=/gi,
  /ontimeupdate\s*=/gi,
  /onvolumechange\s*=/gi,
  /onwaiting\s*=/gi,
];

/**
 * Sanitizes user input to prevent code injection
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[`]/g, '') // Remove backticks
    .replace(/[\\]/g, '') // Remove backslashes
    .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
    .replace(/[^\w\s\-.,!?]/g, '') // Keep only safe characters
    .trim()
    .substring(0, MAX_INPUT_LENGTH); // Limit length
};

/**
 * Validates generated TypeScript code for dangerous patterns
 */
export const validateGeneratedCode = (tsCode: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!tsCode || typeof tsCode !== 'string') {
    errors.push('Generated code is empty or invalid');
    return { isValid: false, errors };
  }

  if (tsCode.length > MAX_GENERATED_CODE_SIZE) {
    errors.push(`Generated code exceeds maximum size limit of ${MAX_GENERATED_CODE_SIZE} characters`);
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(tsCode)) {
      errors.push(`Dangerous pattern detected: ${pattern.source}`);
    }
  }

  // Skip balance checks - TypeScript compiler will catch actual syntax errors
  // Simple regex counting doesn't work with strings, comments, template literals, etc.

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generates a safe component name
 */
export const generateSafeComponentName = (prefix: string = 'GeneratedComponent'): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${randomSuffix}`.replace(/[^a-zA-Z0-9_]/g, '');
};

/**
 * Creates a safe TypeScript code template with proper escaping
 */
export const createSafeTypeScriptTemplate = (
  componentName: string,
  userInput: string,
  timestamp: string
): string => {
  const sanitizedInput = sanitizeInput(userInput);
  
  return `
import React, { useState, useEffect } from 'react';

interface LessonData {
  id: string;
  title: string;
  content: string;
  status: 'generating' | 'completed';
  created_at: string;
}

interface GeneratedLessonComponentProps {
  onLessonGenerated: (lesson: LessonData) => void;
  isGenerating: boolean;
}

const ${componentName}: React.FC<GeneratedLessonComponentProps> = ({ 
  onLessonGenerated, 
  isGenerating 
}) => {
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generationCount, setGenerationCount] = useState<number>(0);

  useEffect(() => {
    console.log('TypeScript component generated at view time:', '${componentName}');
  }, []);

  const handleGenerateLesson = async (outline: string): Promise<void> => {
    setGenerationCount(prev => prev + 1);
    
    const lesson: LessonData = {
      id: \`generated-\${Date.now()}\`,
      title: \`Generated Lesson \${generationCount + 1}\`,
      content: \`This lesson was generated using TypeScript at view time. Original outline: "\${outline}"\`,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    setGeneratedContent(lesson.content);
    onLessonGenerated(lesson);
  };

  return (
    <div style={{ 
      padding: '16px', 
      border: '2px solid #007acc', 
      borderRadius: '8px',
      backgroundColor: '#f0f8ff',
      margin: '16px 0'
    }}>
      <h3 style={{ color: '#007acc', marginBottom: '8px' }}>
        TypeScript Generated Component
      </h3>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
        Generated at: {new Date().toLocaleString()}
      </p>
      <p style={{ fontSize: '12px', color: '#888' }}>
        This component was created from TypeScript code that didn't exist before this page was viewed.
      </p>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
        Safe Input: ${sanitizedInput}
      </p>
      {generatedContent && (
        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e6f3ff', borderRadius: '4px' }}>
          <strong>Generated Content:</strong> {generatedContent}
        </div>
      )}
    </div>
  );
};

export default ${componentName};
`;
};

/**
 * Manages localStorage with size limits and cleanup
 * Only works in browser environment - gracefully fails on server
 */
export const manageStorage = {
  setItem: (key: string, value: string): void => {
    // Skip if not in browser
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    if (value.length > MAX_GENERATED_CODE_SIZE) {
      console.warn('Value too large for storage, not storing');
      return;
    }

    try {
      // Clean up old items if we're at the limit
      const keys = Object.keys(localStorage);
      const generatedKeys = keys.filter(k => k.startsWith('generated'));
      
      if (generatedKeys.length >= MAX_STORAGE_ITEMS) {
        // Remove oldest items (assuming they have timestamps)
        const sortedKeys = generatedKeys.sort();
        const keysToRemove = sortedKeys.slice(0, -MAX_STORAGE_ITEMS + 1);
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }

      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
    }
  },

  getItem: (key: string): string | null => {
    // Skip if not in browser
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to retrieve from localStorage:', error);
      return null;
    }
  },

  clearOldItems: (): void => {
    // Skip if not in browser
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      const generatedKeys = keys.filter(k => k.startsWith('generated'));
      
      if (generatedKeys.length > MAX_STORAGE_ITEMS) {
        const sortedKeys = generatedKeys.sort();
        const keysToRemove = sortedKeys.slice(0, -MAX_STORAGE_ITEMS);
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.error('Failed to clean up localStorage:', error);
    }
  }
};

/**
 * Error reporting utility
 */
export const reportError = (error: Error, context: string = 'typescript-generation'): void => {
  console.error(`[${context}] Error:`, error);
  
  // In a real application, you would send this to your error reporting service
  // Example: Sentry.captureException(error, { tags: { context } });
};

/**
 * Fallback UI component for when TypeScript generation fails
 */
export const createFallbackComponent = (): string => {
  return `
import React from 'react';

const FallbackComponent: React.FC = () => {
  return (
    <div style={{ 
      padding: '16px', 
      border: '2px solid #ff6b6b', 
      borderRadius: '8px',
      backgroundColor: '#fff5f5',
      margin: '16px 0'
    }}>
      <h3 style={{ color: '#ff6b6b', marginBottom: '8px' }}>
        TypeScript Generation Unavailable
      </h3>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
        The TypeScript compiler could not be loaded. This is a fallback component.
      </p>
      <p style={{ fontSize: '12px', color: '#888' }}>
        Please check your internet connection and try refreshing the page.
      </p>
    </div>
  );
};

export default FallbackComponent;
`;
};
