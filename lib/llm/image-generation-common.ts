import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';

/**
 * Generated image with metadata
 */
export interface GeneratedImage {
  base64Data: string;
  prompt: string;
  visualAidLine: string; // The exact Visual Aid line to search for
}

/**
 * Image generation provider interface
 */
export interface ImageProvider {
  name: string;
  generateImage(prompt: string, tracer?: ImageTracer): Promise<string>;
  isAvailable(): boolean;
}

// Export types and interfaces
export type { GeneratedImage as GeneratedImageType, ImageProvider as ImageProviderType };

/**
 * Find all Visual Aid suggestions in the content
 * Returns an array of suggestions with their text and the exact matched line
 * Enforces a maximum of 3 suggestions as per the prompt requirement
 */
export function findVisualAidSuggestions(content: string): { 
  text: string; 
  matchedLine: string;
}[] {
  const suggestions: { text: string; matchedLine: string }[] = [];
  const seenTexts = new Set<string>(); // For deduplication
  
  // Consolidated pattern that matches all variations of Visual Aid suggestions
  // This single pattern handles both **Visual Aid Suggestion:** and Visual Aid Suggestion:** formats
  const pattern = /(?:\*\*)?Visual Aid Suggestion[:\s]*(?:\*\*)?\s*([^\n]+)/gi;
  
  const matches = [...content.matchAll(pattern)];
  
  for (const match of matches) {
    if (match[1]) {
      const text = match[1].trim()
        .replace(/\*\*/g, '')  // Remove markdown bold
        .replace(/[*_]/g, '')  // Remove other markdown
        .replace(/\.$/, '')    // Remove trailing period
        .trim();
      
      // Skip if too short or already seen (deduplication)
      if (text && text.length > 10 && !seenTexts.has(text)) {
        seenTexts.add(text);
        
        const matchedLine = match[0];
        
        logServerMessage('Found Visual Aid', 'info', {
          visualAidText: text.substring(0, 50),
          matchedLine: matchedLine
        });
        
        suggestions.push({
          text,
          matchedLine
        });
        
        // Enforce maximum of 3 suggestions as per prompt requirement
        if (suggestions.length >= 3) {
          logServerMessage('Reached maximum of 3 Visual Aid suggestions', 'info', {
            totalFound: suggestions.length
          });
          break;
        }
      }
    }
  }
  
  return suggestions;
}

/**
 * Extract key concepts from text content (for fallback when no Visual Aid found)
 * Extracts from headers and title
 */
export function extractKeyConceptsFromText(text: string): string[] {
  const concepts: string[] = [];
  
  // Extract main title (# heading)
  const titleMatch = text.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    // Extract the main subject from the title
    const mainSubject = title.split(/[:-]/)[0].trim();
    if (mainSubject && mainSubject.length < 50) {
      concepts.push(mainSubject);
    }
  }
  
  // Extract from headers (##, ###) - get MORE headers, not just 2
  const headerMatches = text.match(/^#{2,3}\s+(.+)$/gm);
  if (headerMatches) {
    headerMatches.forEach(header => {
      const concept = header.replace(/^#{2,3}\s+/, '').trim();
      const cleanConcept = concept.replace(/^\d+\.\s+/, '').split(/[:-]/)[0].trim();
      if (cleanConcept && 
          !cleanConcept.toLowerCase().includes('exercise') && 
          !cleanConcept.toLowerCase().includes('summary') &&
          !cleanConcept.toLowerCase().includes('introduction') &&
          !cleanConcept.toLowerCase().includes('visual aid') &&
          cleanConcept.length < 50 &&
          cleanConcept.length > 3) {
        concepts.push(cleanConcept);
      }
    });
  }
  
  // Extract key sentences from the text (first few sentences)
  // Remove markdown formatting and headers
  const cleanText = text
    .replace(/^#{1,3}\s+.+$/gm, '')  // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
    .replace(/\*(.+?)\*/g, '$1')      // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .trim();
  
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Add first few sentences as concepts (these contain the actual content)
  sentences.slice(0, 3).forEach(sentence => {
    const clean = sentence.trim();
    if (clean.length > 10 && clean.length < 200) {
      concepts.push(clean);
    }
  });
  
  // Return ALL concepts (not limited to 3) - we want rich prompts!
  return concepts;
}

/**
 * Create an educational image prompt from key concepts
 * Formats the prompt to generate clear, educational illustrations
 */
export function createEducationalImagePrompt(
  concepts: string[], 
  section: 'overview' | 'introduction' | 'details'
): string {
  if (concepts.length === 0) {
    return 'Educational illustration, colorful, simple, clear';
  }
  
  // If the first concept is already a complete Visual Aid suggestion, use it directly
  const mainConcept = concepts[0];
  const isVisualAidPrompt = mainConcept.length > 40 && (
      mainConcept.toLowerCase().includes('picture') ||
      mainConcept.toLowerCase().includes('illustration') ||
      mainConcept.toLowerCase().includes('image') ||
      mainConcept.toLowerCase().includes('showing') ||
      mainConcept.toLowerCase().includes('diagram')
  );
  
  if (isVisualAidPrompt) {
    // It's a complete Visual Aid description
    // Add supporting concepts from the section for richer context
    const supportingConcepts = concepts.slice(1, 6)  // Use up to 5 more concepts
      .filter(c => c.length < 100)  // Keep concepts reasonably sized
      .join(', ');
    
    let prompt = mainConcept;
    if (supportingConcepts) {
      prompt += `. Context: ${supportingConcepts}`;
    }
    prompt += '. Educational illustration, colorful, simple and clear';
    
    return prompt;
  }
  
  // Otherwise, build from multiple concepts to create a rich prompt
  // Use MORE concepts (not just 2-3) to represent the section better
  const additionalConcepts = concepts.slice(1, 6)  // Use up to 5 additional concepts
    .filter(c => c.length < 100)  // Keep concepts reasonably sized
    .join(', ');
  
  let prompt = `${mainConcept}`;
  if (additionalConcepts) {
    prompt += `. ${additionalConcepts}`;
  }
  
  // Add style descriptors that work well with Stable Diffusion
  prompt += '. Educational illustration, colorful, simple and clear, children friendly';
  
  return prompt;
}

/**
 * Extract key concepts and create image generation prompts from lesson content
 * @param content The full lesson content in markdown format
 * @returns Array of prompts for image generation with section targets
 * If Visual Aid hints are found, returns one prompt per hint (no limit).
 * If no Visual Aid hints, returns prompts for sections 2 and 3 (2 images).
 */
export async function extractImagePromptsFromContent(
  content: string
): Promise<{ prompt: string; visualAidLine: string }[]> {
  try {
    logServerMessage('Extracting image prompts from content', 'info', { 
      contentLength: content.length
    });
    
    // Split content into sections by headers (## or ###)
    const sections = content.split(/^#{2,3}\s+/m).filter(s => s.trim());
    
    logServerMessage('Content split into sections', 'info', {
      totalSections: sections.length,
      sectionSummary: sections.map((s, i) => ({
        index: i,
        length: s.length,
        firstLine: s.split('\n')[0].substring(0, 60),
        hasVisualAid: /Visual Aid/i.test(s)
      }))
    });
    
    // PRIORITY: Look for Visual Aid suggestions across all sections
    const visualAidSuggestions = findVisualAidSuggestions(content);
    
    logServerMessage('Found Visual Aid suggestions', 'info', {
      count: visualAidSuggestions.length,
      suggestions: visualAidSuggestions.map(v => ({ 
        text: v.text.substring(0, 50) 
      }))
    });
    
    // If we have Visual Aid suggestions, use ALL of them!
    if (visualAidSuggestions.length > 0) {
      const selectedSuggestions = visualAidSuggestions;
      
      logServerMessage('Creating prompts from Visual Aid suggestions', 'info', {
        count: selectedSuggestions.length,
        sections: selectedSuggestions.map(s => ({
          text: s.text,
          contentLength: content.length // This will be incorrect as content is split
        }))
      });
      
      const prompts = selectedSuggestions.map((suggestion, index) => {
        // Use the Visual Aid text as the PRIMARY prompt
        // Add the FULL section content for additional context
        // The Visual Aid suggestion is already a good description
        const visualAidPrompt = suggestion.text;
        
        // Extract key concepts from the FULL section content
        const sectionConcepts = extractKeyConceptsFromText(content);
        
        // If Visual Aid already looks like a complete prompt (descriptive), use it directly
        // Otherwise, enhance it with section concepts
        let finalPrompt: string;
        
        if (visualAidPrompt.length > 40 && (
            visualAidPrompt.toLowerCase().includes('picture') ||
            visualAidPrompt.toLowerCase().includes('illustration') ||
            visualAidPrompt.toLowerCase().includes('image') ||
            visualAidPrompt.toLowerCase().includes('showing') ||
            visualAidPrompt.toLowerCase().includes('diagram')
        )) {
          // Visual Aid is descriptive enough - use it as main prompt with section concepts
          const allConcepts = [visualAidPrompt, ...sectionConcepts];
          finalPrompt = createEducationalImagePrompt(allConcepts, index === 0 ? 'introduction' : 'details');
        } else {
          // Visual Aid is short - combine with more section context
          const allConcepts = [visualAidPrompt, ...sectionConcepts];
          finalPrompt = createEducationalImagePrompt(allConcepts, index === 0 ? 'introduction' : 'details');
        }
        
        // Fix section index mapping: split()[0] is content before first ##,
        // but lessonStructure.sections[0] is the first ## section
        // So we need to subtract 1 from sectionIndex when it's > 0
        const mappedSectionIndex = 0; // Since we are not using lessonStructure.sections here
        
        logServerMessage(`Created prompt for image ${index + 1}`, 'info', {
          imageNumber: index + 1,
          visualAid: visualAidPrompt,
          matchedLine: suggestion.matchedLine,
          sectionConceptsCount: sectionConcepts.length,
          sectionConcepts: sectionConcepts,
          finalPrompt: finalPrompt,
          splitSectionIndex: 0, // This will be incorrect
          mappedSectionIndex: mappedSectionIndex
        });
        
        return {
          prompt: finalPrompt,
          visualAidLine: suggestion.matchedLine
        };
      });
      
      logServerMessage('Final prompts for image generation', 'info', {
        count: prompts.length,
        prompts: prompts.map((p, i) => ({ 
          imageNumber: i + 1,
          promptPreview: p.prompt.substring(0, 80),
          visualAidLine: p.visualAidLine.substring(0, 60)
        }))
      });
      
      return prompts;
    }
    
    // NO IMAGES if no Visual Aid hints found
    logServerMessage('No Visual Aid suggestions found - returning empty array (no images will be generated)', 'info');
    
    return [];
  } catch (error) {
    logServerError(error as Error, { operation: 'extract_image_prompts' });
    throw error;
  }
}

/**
 * Generate multiple images in parallel using a provider
 * @param prompts Array of prompts with their positions
 * @param provider Image generation provider
 * @param tracer Optional ImageTracer for logging
 * @returns Array of generated images
 */
export async function generateImagesInParallel(
  prompts: { prompt: string; visualAidLine: string }[],
  provider: ImageProvider,
  tracer?: ImageTracer
): Promise<GeneratedImage[]> {
  try {
    logServerMessage(`Generating ${prompts.length} images in parallel with ${provider.name}`, 'info', { 
      count: prompts.length,
      provider: provider.name
    });
    
    const imagePromises = prompts.map(async ({ prompt, visualAidLine }) => {
      try {
        const base64Data = await provider.generateImage(prompt, tracer);
        return {
          base64Data,
          prompt,
          visualAidLine
        };
      } catch (error) {
        logServerError(error as Error, { 
          operation: 'parallel_image_generation', 
          provider: provider.name,
          prompt: prompt.substring(0, 50)
        });
        // Return null for failed images, we'll filter them out
        return null;
      }
    });
    
    const results = await Promise.all(imagePromises);
    const successfulImages: GeneratedImage[] = results.filter((img) => img !== null) as GeneratedImage[];
    
    logServerMessage('Parallel image generation complete', 'info', { 
      provider: provider.name,
      total: prompts.length,
      successful: successfulImages.length,
      failed: prompts.length - successfulImages.length
    });
    
    return successfulImages;
  } catch (error) {
    logServerError(error as Error, { 
      operation: 'generate_images_parallel',
      provider: provider.name
    });
    throw error;
  }
}

