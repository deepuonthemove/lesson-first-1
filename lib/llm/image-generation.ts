/**
 * Image Generation Orchestrator
 * 
 * Manages multiple image generation providers with automatic fallback:
 * 1. Pollinations.ai (FREE, no API key)
 * 2. ImageRouter.io (requires IMAGEROUTERIO_API_KEY)
 * 3. Hugging Face (requires HUGGINGFACE_API_KEY)
 */

import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';
import type {
  GeneratedImage,
  ImageProvider
} from './image-generation-common';
import {
  extractImagePromptsFromContent,
  generateImagesInParallel as generateImagesInParallelCommon
} from './image-generation-common';
import { createPollinationsProvider } from './pollinations-image';
import { createImageRouterProvider } from './imagerouter-image';
import { createHuggingFaceProvider } from './huggingface-image';

// Re-export types and functions for use by other modules
export type { GeneratedImage };
export { extractImagePromptsFromContent };

/**
 * Get all available image generation providers in priority order
 */
function getAvailableProviders(): ImageProvider[] {
  const providers: ImageProvider[] = [];
  
  // Priority order: Pollinations → ImageRouter → Hugging Face
  const pollinationsProvider = createPollinationsProvider();
  const pollinationsAvailable = pollinationsProvider.isAvailable();
  logServerMessage('Checking Pollinations.ai provider', 'info', {
    available: pollinationsAvailable,
    reason: pollinationsAvailable ? 'Always available (no API key needed)' : 'Not available'
  });
  if (pollinationsAvailable) {
    providers.push(pollinationsProvider);
  }
  
  const imageRouterProvider = createImageRouterProvider();
  const imageRouterAvailable = imageRouterProvider.isAvailable();
  logServerMessage('Checking ImageRouter.io provider', 'info', {
    available: imageRouterAvailable,
    reason: imageRouterAvailable ? 'API key found' : 'API key not set (IMAGEROUTERIO_API_KEY)',
    hasEnvVar: !!process.env.IMAGEROUTERIO_API_KEY
  });
  if (imageRouterAvailable) {
    providers.push(imageRouterProvider);
  }
  
  const huggingFaceProvider = createHuggingFaceProvider();
  const huggingFaceAvailable = huggingFaceProvider.isAvailable();
  logServerMessage('Checking Hugging Face provider', 'info', {
    available: huggingFaceAvailable,
    reason: huggingFaceAvailable ? 'API key found' : 'API key not set (HUGGINGFACE_API_KEY)',
    hasEnvVar: !!process.env.HUGGINGFACE_API_KEY
  });
  if (huggingFaceAvailable) {
    providers.push(huggingFaceProvider);
  }
  
  logServerMessage('Provider availability summary', 'info', {
    totalAvailable: providers.length,
    providers: providers.map(p => p.name),
    pollinationsAvailable,
    imageRouterAvailable,
    huggingFaceAvailable
  });
  
  return providers;
}

/**
 * Generate a single image using the first available provider with automatic fallback
 * @param prompt The text prompt describing the image
 * @param tracer Optional ImageTracer for logging
 * @returns Base64 encoded image data
 */
export async function generateImage(prompt: string, tracer?: ImageTracer): Promise<string> {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No image generation providers available. Please set at least one API key: IMAGEROUTERIO_API_KEY or HUGGINGFACE_API_KEY');
  }
  
  logServerMessage('Image generation providers available', 'info', {
    count: providers.length,
    providers: providers.map(p => p.name)
  });
  
  let lastError: Error | null = null;
  
  // Try each provider in order
  for (const provider of providers) {
    try {
      logServerMessage(`Trying image generation with ${provider.name}`, 'info');
      const result = await provider.generateImage(prompt, tracer);
      
      logServerMessage(`✓ Successfully generated image with ${provider.name}`, 'info');
      return result;
    } catch (error) {
      lastError = error as Error;
      logServerMessage(`Provider ${provider.name} failed, trying next...`, 'warning', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      continue;
    }
  }
  
  // All providers failed
  const errorMessage = `All image generation providers failed. Last error: ${lastError?.message || 'Unknown error'}`;
  logServerError(new Error(errorMessage), { 
    operation: 'generate_image_all_providers_failed',
    triedProviders: providers.map(p => p.name)
  });
  throw new Error(errorMessage);
}

/**
 * Generate multiple images in parallel using the first available provider
 * @param prompts Array of prompts with their positions
 * @param tracer Optional ImageTracer for logging
 * @returns Array of generated images
 */
export async function generateImagesInParallel(
  prompts: { prompt: string; position: 'first-half' | 'second-half' | 'full'; targetSection: number }[],
  tracer?: ImageTracer
): Promise<GeneratedImage[]> {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No image generation providers available. Please set at least one API key: IMAGEROUTERIO_API_KEY or HUGGINGFACE_API_KEY');
  }
  
  logServerMessage('Starting parallel image generation', 'info', {
    imageCount: prompts.length,
    availableProviders: providers.map(p => p.name)
  });
  
  let lastError: Error | null = null;
  
  // Try each provider in order
  for (const provider of providers) {
    try {
      logServerMessage(`Attempting parallel generation with ${provider.name}`, 'info');
      
      const images = await generateImagesInParallelCommon(prompts, provider, tracer);
      
      if (images.length > 0) {
        logServerMessage(`✓ Successfully generated ${images.length} images with ${provider.name}`, 'info');
        return images;
      }
      
      // Provider returned 0 images - try next provider
      logServerMessage(`Provider ${provider.name} returned 0 images, trying next...`, 'warning');
      continue;
    } catch (error) {
      lastError = error as Error;
      logServerMessage(`Provider ${provider.name} failed, trying next...`, 'warning', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      continue;
    }
  }
  
  // All providers failed
  const errorMessage = `All image generation providers failed. Last error: ${lastError?.message || 'Unknown error'}`;
  logServerError(new Error(errorMessage), { 
    operation: 'generate_images_parallel_all_providers_failed',
    triedProviders: providers.map(p => p.name),
    requestedImages: prompts.length
  });
  throw new Error(errorMessage);
}

/**
 * Check if any image generation provider is available
 */
export function isImageGenerationAvailable(): boolean {
  return getAvailableProviders().length > 0;
}

/**
 * Get list of available provider names
 */
export function getAvailableProviderNames(): string[] {
  return getAvailableProviders().map(p => p.name);
}

