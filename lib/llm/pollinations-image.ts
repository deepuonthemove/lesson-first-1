import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';
import { ImageProvider } from './image-generation-common';

/**
 * Pollinations.ai Image Generation Provider
 * FREE API - No API key required!
 * 
 * Features:
 * - Multiple models available (flux, flux-realism, flux-anime, flux-3d, turbo, etc.)
 * - No rate limits on free tier
 * - Simple REST API
 * - Good for educational content
 */
export class PollinationsImageProvider implements ImageProvider {
  name = 'pollinations.ai';
  
  // Models to try in order
  private modelsToTry = [
    'flux',           // Best quality, slower
    'flux-realism',   // Realistic images
    'turbo',          // Faster, good quality
  ];
  
  isAvailable(): boolean {
    // Pollinations is always available (no API key needed)
    return true;
  }
  
  async generateImage(prompt: string, tracer?: ImageTracer): Promise<string> {
    try {
      logServerMessage('Starting image generation with Pollinations.ai', 'info', { 
        prompt: prompt.substring(0, 100) 
      });
      
      logServerMessage('Will try Pollinations models', 'info', { 
        totalModels: this.modelsToTry.length,
        models: this.modelsToTry
      });
      
      let lastError: Error | null = null;
      
      for (const model of this.modelsToTry) {
        const attemptStartTime = Date.now();
        try {
          logServerMessage(`Attempting Pollinations model: ${model}`, 'info');
          
          // Pollinations API endpoint
          // GET https://image.pollinations.ai/prompt/{prompt}?model={model}&width=1024&height=1024&nologo=true
          const encodedPrompt = encodeURIComponent(prompt);
          const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=1024&height=1024&nologo=true&enhance=true`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'image/*'
            }
          });
          
          if (!response.ok) {
            const attemptDuration = Date.now() - attemptStartTime;
            const errorText = await response.text();
            
            if (tracer) {
              tracer.addImageGenerationAttempt({
                model: `pollinations-${model}`,
                prompt,
                request: { prompt, model, options: { width: 1024, height: 1024 } },
                response: { success: false, error: errorText },
                duration_ms: attemptDuration,
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
              });
            }
            
            logServerMessage(`Pollinations model ${model} failed: HTTP ${response.status}`, 'warning');
            continue;
          }
          
          // Get image as blob
          const imageBlob = await response.blob();
          
          // Convert blob to base64
          const arrayBuffer = await imageBlob.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const attemptDuration = Date.now() - attemptStartTime;
          
          if (base64Data && base64Data.length > 0) {
            logServerMessage('✓ Image generated successfully with Pollinations.ai!', 'info', { 
              model,
              dataSize: base64Data.length,
              duration: attemptDuration
            });
            
            if (tracer) {
              tracer.addImageGenerationAttempt({
                model: `pollinations-${model}`,
                prompt,
                request: { prompt, model, options: { width: 1024, height: 1024 } },
                response: { success: true, dataSize: base64Data.length },
                duration_ms: attemptDuration,
                success: true
              });
            }
            
            return base64Data;
          }
          
          logServerMessage(`Pollinations model ${model} responded but no image data`, 'warning');
          
          if (tracer) {
            tracer.addImageGenerationAttempt({
              model: `pollinations-${model}`,
              prompt,
              request: { prompt, model },
              response: { success: false, error: 'No image data' },
              duration_ms: attemptDuration,
              success: false,
              error: 'No image data'
            });
          }
          
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message || error?.toString() || 'Unknown error';
          const attemptDuration = Date.now() - attemptStartTime;
          
          if (tracer && !error?.message?.includes('HTTP')) {
            tracer.addImageGenerationAttempt({
              model: `pollinations-${model}`,
              prompt,
              request: { prompt, model },
              response: { success: false, error: errorMsg },
              duration_ms: attemptDuration,
              success: false,
              error: errorMsg
            });
          }
          
          logServerMessage(`Pollinations model ${model} failed: ${errorMsg}`, 'warning');
          continue;
        }
      }
      
      // All models failed
      logServerMessage('All Pollinations models failed to generate image', 'error', { 
        attemptedModels: this.modelsToTry.length
      });
      
      throw lastError || new Error('No Pollinations models could generate images - all attempts failed');
      
    } catch (error) {
      logServerError(error as Error, { 
        operation: 'pollinations_image_generation', 
        prompt: prompt.substring(0, 100) 
      });
      throw new Error(`Pollinations.ai failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create and return a Pollinations image provider instance
 */
export function createPollinationsProvider(): PollinationsImageProvider {
  return new PollinationsImageProvider();
}

