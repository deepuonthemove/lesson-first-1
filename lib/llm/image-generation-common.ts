import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';

/**
 * Generated image with metadata
 */
export interface GeneratedImage {
  base64Data: string;
  prompt: string;
  position: 'first-half' | 'second-half' | 'full';
  targetSection: number;
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
 * Returns an array of suggestions with their section indices and FULL section content
 */
export function findVisualAidSuggestions(sections: string[]): { text: string; sectionIndex: number; sectionContent: string }[] {
  const suggestions: { text: string; sectionIndex: number; sectionContent: string }[] = [];
  
  // Search patterns for Visual Aid suggestions
  const patterns = [
    /\*\*Visual Aid Suggestion[:\s]*\*\*\s*([^\n]+)/i,
    /Visual Aid Suggestion[:\s]+([^\n]+)/i,
    /\*\*Visual Aid[:\s]*\*\*\s*([^\n]+)/i,
    /Visual Aid[:\s]+([^\n]+)/i
  ];
  
  sections.forEach((section, index) => {
    for (const pattern of patterns) {
      const match = section.match(pattern);
      if (match && match[1]) {
        const text = match[1].trim()
          .replace(/\*\*/g, '')  // Remove markdown bold
          .replace(/[*_]/g, '')  // Remove other markdown
          .replace(/\.$/, '')    // Remove trailing period
          .trim();
        
        if (text && text.length > 10) {
          // Extract FULL section content (remove the visual aid line itself)
          // NO character limit - we want the entire section for context
          const sectionContent = section
            .replace(pattern, '')  // Remove the visual aid suggestion line
            .trim();
          
          logServerMessage('Found Visual Aid in section', 'info', {
            sectionIndex: index,
            visualAidText: text,
            sectionLength: sectionContent.length,
            sectionPreview: sectionContent.substring(0, 100)
          });
          
          suggestions.push({
            text,
            sectionIndex: index,
            sectionContent
          });
          break; // Found one in this section, move to next section
        }
      }
    }
  });
  
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
 * @param count Number of images to generate (1 or 2)
 * @returns Array of prompts for image generation with section targets
 */
export async function extractImagePromptsFromContent(
  content: string, 
  count: 1 | 2
): Promise<{ prompt: string; position: 'first-half' | 'second-half' | 'full'; targetSection: number }[]> {
  try {
    logServerMessage('Extracting image prompts from content', 'info', { 
      contentLength: content.length, 
      imageCount: count 
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
    const visualAidSuggestions = findVisualAidSuggestions(sections);
    
    logServerMessage('Found Visual Aid suggestions', 'info', {
      count: visualAidSuggestions.length,
      suggestions: visualAidSuggestions.map(v => ({ 
        section: v.sectionIndex, 
        text: v.text.substring(0, 50) 
      }))
    });
    
    // If we have enough Visual Aid suggestions, use them!
    if (visualAidSuggestions.length >= count) {
      const selectedSuggestions = visualAidSuggestions.slice(0, count);
      
      logServerMessage('Creating prompts from Visual Aid suggestions', 'info', {
        count: selectedSuggestions.length,
        sections: selectedSuggestions.map(s => ({
          index: s.sectionIndex,
          visualAid: s.text,
          contentLength: s.sectionContent.length
        }))
      });
      
      const prompts = selectedSuggestions.map((suggestion, index) => {
        // Use the Visual Aid text as the PRIMARY prompt
        // Add the FULL section content for additional context
        // The Visual Aid suggestion is already a good description
        const visualAidPrompt = suggestion.text;
        
        // Extract key concepts from the FULL section content
        const sectionConcepts = extractKeyConceptsFromText(suggestion.sectionContent);
        
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
        
        logServerMessage(`Created prompt for image ${index + 1}`, 'info', {
          imageNumber: index + 1,
          visualAid: visualAidPrompt,
          sectionConceptsCount: sectionConcepts.length,
          sectionConcepts: sectionConcepts,
          finalPrompt: finalPrompt,
          targetSection: suggestion.sectionIndex
        });
        
        return {
          prompt: finalPrompt,
          position: (count === 1 ? 'full' : (index === 0 ? 'first-half' : 'second-half')) as 'first-half' | 'second-half' | 'full',
          targetSection: suggestion.sectionIndex
        };
      });
      
      logServerMessage('Final prompts for image generation', 'info', {
        prompts: prompts.map((p, i) => ({ 
          imageNumber: i + 1,
          prompt: p.prompt,
          targetSection: p.targetSection,
          position: p.position
        }))
      });
      
      return prompts;
    }
    
    // FALLBACK: Use the old logic (sections 2 and 3)
    logServerMessage('Not enough Visual Aid suggestions, using section-based logic', 'info');
    
    if (count === 1) {
      // For 1 image, extract from sections 2 and 3 combined, place after section 3
      const section2 = sections[1] || '';
      const section3 = sections[2] || '';
      const combinedContent = `${section2}\n${section3}`;
      
      const keyConcepts = extractKeyConceptsFromText(combinedContent);
      const prompt = createEducationalImagePrompt(keyConcepts, 'overview');
      
      logServerMessage('Generated image prompt (fallback)', 'info', { 
        prompt,
        concepts: keyConcepts,
        targetSection: 2
      });
      
      return [{
        prompt,
        position: 'full',
        targetSection: 2 // Place after section 3 (0-indexed, so section 2)
      }];
    } else {
      // For 2 images, extract from section 2 and section 3 separately
      const section2 = sections[1] || '';
      const section3 = sections[2] || '';
      
      const concepts2 = extractKeyConceptsFromText(section2);
      const concepts3 = extractKeyConceptsFromText(section3);
      
      const prompts = [
        {
          prompt: createEducationalImagePrompt(concepts2, 'introduction'),
          position: 'first-half' as const,
          targetSection: 1 // Place after section 2 (0-indexed, so section 1)
        },
        {
          prompt: createEducationalImagePrompt(concepts3, 'details'),
          position: 'second-half' as const,
          targetSection: 2 // Place after section 3 (0-indexed, so section 2)
        }
      ];
      
      logServerMessage('Generated image prompts (fallback)', 'info', { 
        prompt1: prompts[0].prompt,
        concepts1: concepts2,
        prompt2: prompts[1].prompt,
        concepts2: concepts3
      });
      
      return prompts;
    }
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
  prompts: { prompt: string; position: 'first-half' | 'second-half' | 'full'; targetSection: number }[],
  provider: ImageProvider,
  tracer?: ImageTracer
): Promise<GeneratedImage[]> {
  try {
    logServerMessage(`Generating ${prompts.length} images in parallel with ${provider.name}`, 'info', { 
      count: prompts.length,
      provider: provider.name
    });
    
    const imagePromises = prompts.map(async ({ prompt, position, targetSection }) => {
      try {
        const base64Data = await provider.generateImage(prompt, tracer);
        return {
          base64Data,
          prompt,
          position,
          targetSection
        };
      } catch (error) {
        logServerError(error as Error, { 
          operation: 'parallel_image_generation', 
          provider: provider.name,
          prompt: prompt.substring(0, 50),
          position 
        });
        // Return null for failed images, we'll filter them out
        return null;
      }
    });
    
    const results = await Promise.all(imagePromises);
    const successfulImages = results.filter((img): img is GeneratedImage => img !== null);
    
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

