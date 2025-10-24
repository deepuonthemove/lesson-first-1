export interface LessonGenerationOptions {
  outline: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // in minutes
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  includeExamples?: boolean;
  includeExercises?: boolean;
}

/**
 * System prompt for lesson generation
 * Used by providers that support system/user message separation (OpenAI, Anthropic, Groq, Gemini, Qwen)
 */
export const SYSTEM_PROMPT = `You are an expert educational content creator. Generate comprehensive, engaging lesson content based on the provided outline.

Guidelines:
- Create structured, well-organized content with clear sections
- Use appropriate markdown formatting (headers, lists, code blocks, etc.)
- Include practical examples and real-world applications
- Make content accessible for the specified difficulty level
- Adapt to the learning style preference
- Include interactive elements when appropriate
- Ensure content is accurate and up-to-date
- Use clear, engaging language that maintains student interest

Content Structure:
1. Introduction with learning objectives
2. Main content sections with clear explanations
3. Examples and practical applications
4. Key takeaways and summary
5. Next steps or further reading

Format the response as a complete lesson with proper markdown formatting.`;

/**
 * User prompt for lesson generation
 * Used by providers that support system/user message separation (OpenAI, Anthropic, Groq, Gemini, Qwen)
 */
export function getUserPrompt(options: LessonGenerationOptions): string {
  const {
    outline,
    difficulty = 'intermediate',
    duration = 30,
    learningStyle = 'reading',
    includeExamples = true,
    includeExercises = true
  } = options;

  return `Create a comprehensive lesson based on this outline: "${outline}"

Requirements:
- Difficulty Level: ${difficulty}
- Estimated Duration: ${duration} minutes
- Learning Style: ${learningStyle}
- Include Examples: ${includeExamples ? 'Yes' : 'No'}
- Include Exercises: ${includeExercises ? 'Yes' : 'No'}

Please generate a complete lesson with:
1. A compelling title
2. Clear learning objectives
3. Structured content with examples
4. Key concepts highlighted
5. Practical applications
6. Summary and next steps

Format everything in proper markdown.`;
}

/**
 * Combined prompt for providers that don't support system/user message separation
 * Used by Hugging Face and Ollama
 */
export function getCombinedPrompt(options: LessonGenerationOptions): string {
  const {
    outline,
    difficulty = 'intermediate',
    duration = 30,
    learningStyle = 'reading',
    includeExamples = true,
    includeExercises = true
  } = options;

  return `You are an expert educational content creator. Create a comprehensive lesson based on this outline: "${outline}"

Requirements:
- Difficulty Level: ${difficulty}
- Estimated Duration: ${duration} minutes
- Learning Style: ${learningStyle}
- Include Examples: ${includeExamples ? 'Yes' : 'No'}
- Include Exercises: ${includeExercises ? 'Yes' : 'No'}

Please generate a complete lesson with:
1. A compelling title (start with #)
2. Clear learning objectives
3. Structured content with examples
4. Key concepts highlighted
5. Practical applications
6. Summary and next steps

Format everything in proper markdown.`;
}

/**
 * Utility functions for extracting structured information from generated content
 */
export function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1] : 'Generated Lesson';
}

export function extractKeyConcepts(content: string): string[] {
  const concepts: string[] = [];
  
  // Look for bullet points or numbered lists that might contain key concepts
  const lines = content.split('\n');
  let inKeyConceptsSection = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('key concept') || line.toLowerCase().includes('main concept')) {
      inKeyConceptsSection = true;
      continue;
    }
    
    if (inKeyConceptsSection && (line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line))) {
      const concept = line.replace(/^[-*]\s+|\d+\.\s+/, '').trim();
      if (concept) concepts.push(concept);
    }
    
    if (inKeyConceptsSection && line.trim() === '') {
      inKeyConceptsSection = false;
    }
  }
  
  return concepts.length > 0 ? concepts : ['Core concepts from the lesson'];
}

export function extractPrerequisites(content: string): string[] {
  const prerequisites: string[] = [];
  
  const lines = content.split('\n');
  let inPrerequisitesSection = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('prerequisite') || line.toLowerCase().includes('required knowledge')) {
      inPrerequisitesSection = true;
      continue;
    }
    
    if (inPrerequisitesSection && (line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line))) {
      const prereq = line.replace(/^[-*]\s+|\d+\.\s+/, '').trim();
      if (prereq) prerequisites.push(prereq);
    }
    
    if (inPrerequisitesSection && line.trim() === '') {
      inPrerequisitesSection = false;
    }
  }
  
  return prerequisites.length > 0 ? prerequisites : ['Basic understanding of the topic'];
}

export function extractDuration(content: string): number | null {
  const durationMatch = content.match(/(\d+)\s*(?:minute|min|hour|hr)/i);
  return durationMatch ? parseInt(durationMatch[1]) : null;
}
