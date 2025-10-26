import { generateLessonWithOpenAI, type GeneratedLesson } from './openai';
import { type LessonGenerationOptions } from './prompts';
import { generateLessonWithAnthropic } from './anthropic';
import { generateLessonWithGroq } from './groq';
import { generateLessonWithGemini } from './gemini';
import { generateLessonWithHuggingFace } from './huggingface';
import { generateLessonWithOllama } from './ollama';
import { generateLessonWithQwen } from './qwen';
import { LessonTracer } from '@/lib/tracing';

export type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'gemini' | 'huggingface' | 'ollama' | 'qwen';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  fallbackProvider?: LLMProvider;
}

export async function generateLesson(
  options: LessonGenerationOptions,
  config: LLMConfig = { provider: getDefaultProvider() }
): Promise<GeneratedLesson> {
  return generateLessonWithTracing(options, config);
}

export async function generateLessonWithTracing(
  options: LessonGenerationOptions,
  config: LLMConfig = { provider: getDefaultProvider() },
  lessonId?: string
): Promise<GeneratedLesson> {
  const { provider } = config;
  
  // Initialize tracer if lessonId is provided
  const tracer = lessonId ? new LessonTracer(lessonId) : null;
  if (tracer) {
    await tracer.startTrace(options);
  }
  
  // Get available providers for automatic fallback
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    const error = 'No LLM providers configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY';
    if (tracer) {
      await tracer.failTrace(error);
    }
    throw new Error(error);
  }

  // If the requested provider is not available, use the first available one
  const primaryProvider = availableProviders.includes(provider) ? provider : availableProviders[0];
  const fallbackProviders = availableProviders.filter(p => p !== primaryProvider);

  console.log(`Using primary provider: ${primaryProvider}`);
  if (fallbackProviders.length > 0) {
    console.log(`Available fallback providers: ${fallbackProviders.join(', ')}`);
  }

  // Try primary provider
  try {
    const result = await callProviderWithTracing(primaryProvider, options, tracer);
    if (tracer) {
      await tracer.completeTrace(result, primaryProvider, fallbackProviders);
    }
    return result;
  } catch (error) {
    console.error(`Error with primary provider ${primaryProvider}:`, error);
    
    // Try fallback providers in order
    for (const fallbackProvider of fallbackProviders) {
      try {
        console.log(`Trying fallback provider: ${fallbackProvider}`);
        const result = await callProviderWithTracing(fallbackProvider, options, tracer);
        if (tracer) {
          await tracer.completeTrace(result, fallbackProvider, fallbackProviders);
        }
        return result;
      } catch (fallbackError) {
        console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
        // Continue to next fallback provider
      }
    }
    
    // If all providers fail, update tracer and throw error
    const errorMessage = `All LLM providers failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    if (tracer) {
      await tracer.failTrace(errorMessage);
    }
    throw new Error(errorMessage);
  }
}

async function callProviderWithTracing(
  provider: LLMProvider, 
  options: LessonGenerationOptions, 
  tracer: LessonTracer | null
): Promise<GeneratedLesson> {
  const startTime = Date.now();
  
  try {
    let result: GeneratedLesson;
    
    switch (provider) {
      case 'openai':
        result = await generateLessonWithOpenAI(options);
        break;
      case 'anthropic':
        result = await generateLessonWithAnthropic(options);
        break;
      case 'groq':
        result = await generateLessonWithGroq(options);
        break;
      case 'gemini':
        result = await generateLessonWithGemini(options);
        break;
      case 'huggingface':
        result = await generateLessonWithHuggingFace(options);
        break;
      case 'ollama':
        result = await generateLessonWithOllama(options);
        break;
      case 'qwen':
        result = await generateLessonWithQwen(options);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
    
    const duration = Date.now() - startTime;
    
    // Add LLM call to tracer
    if (tracer) {
      tracer.addLLMCall({
        provider,
        request: {
          prompt: `Generate lesson: ${options.outline}`,
          model: 'default',
          temperature: 0.7,
          max_tokens: 4000
        },
        response: {
          content: result.content,
          usage: {
            prompt_tokens: 0, // These would need to be extracted from actual API responses
            completion_tokens: 0,
            total_tokens: 0
          }
        },
        duration_ms: duration,
        success: true
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Add failed LLM call to tracer
    if (tracer) {
      tracer.addLLMCall({
        provider,
        request: {
          prompt: `Generate lesson: ${options.outline}`,
          model: 'default',
          temperature: 0.7,
          max_tokens: 4000
        },
        duration_ms: duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    throw error;
  }
}

export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  
  // Google first (AI Studio)
  if (process.env.GOOGLE_API_KEY) {
    providers.push('gemini');
  }
  
  // Groq second
  if (process.env.GROQ_API_KEY) {
    providers.push('groq');
  }
  
  // Qwen third
  if (process.env.HUGGINGFACE_API_KEY) {
    providers.push('qwen');
  }
  
  // Other free providers
  if (process.env.HUGGINGFACE_API_KEY) {
    providers.push('huggingface');
  }
  
  // Check if Ollama is running locally
  if (process.env.OLLAMA_URL || process.env.NODE_ENV === 'development') {
    providers.push('ollama');
  }
  
  // Paid providers (as fallback)
  if (process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push('anthropic');
  }
  
  return providers;
}

export function getDefaultProvider(): LLMProvider {
  const available = getAvailableProviders();
  
  // Priority order: Google → Groq → Qwen → others
  const priorityProviders: LLMProvider[] = ['gemini', 'groq', 'qwen', 'huggingface', 'ollama', 'openai', 'anthropic'];
  
  // Try providers in priority order
  for (const provider of priorityProviders) {
    if (available.includes(provider)) {
      return provider;
    }
  }
  
  return available[0] || 'gemini' as LLMProvider; // Default to Gemini (Google AI Studio)
}

// Re-export types and functions for convenience
export type { LessonGenerationOptions } from './prompts';
export type { GeneratedLesson } from './openai';
export { generateLessonWithOpenAI } from './openai';
export { generateLessonWithAnthropic } from './anthropic';
export { generateLessonWithGroq } from './groq';
export { generateLessonWithGemini } from './gemini';
export { generateLessonWithHuggingFace } from './huggingface';
export { generateLessonWithOllama } from './ollama';
export { generateLessonWithQwen } from './qwen';
