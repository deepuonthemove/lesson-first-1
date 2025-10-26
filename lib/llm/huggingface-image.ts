import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';
import { ImageProvider } from './image-generation-common';

/**
 * Hugging Face Image Generation Provider
 * Requires API key: HUGGINGFACE_API_KEY
 * 
 * Features:
 * - FREE Inference API
 * - Multiple Stable Diffusion models
 * - Good for educational content
 * - May have model loading delays on free tier
 */
export class HuggingFaceImageProvider implements ImageProvider {
  name = 'huggingface';
  private apiKey: string | undefined;
  
  // Free Hugging Face models to try (in priority order)
  private modelsToTry = [
    'stabilityai/stable-diffusion-xl-base-1.0',
    'stabilityai/stable-diffusion-2-1',
    'runwayml/stable-diffusion-v1-5',
    'CompVis/stable-diffusion-v1-4',
    'prompthero/openjourney-v4',
    'Lykon/DreamShaper',
  ];
  
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async generateImage(prompt: string, tracer?: ImageTracer): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('HUGGINGFACE_API_KEY environment variable is not set');
      }
      
      logServerMessage('Starting image generation with Hugging Face', 'info', { 
        prompt: prompt.substring(0, 100) 
      });
      
      logServerMessage('Will try Hugging Face models', 'info', { 
        totalModels: this.modelsToTry.length,
        models: this.modelsToTry
      });
      
      let lastError: Error | null = null;
      
      for (const modelId of this.modelsToTry) {
        const attemptStartTime = Date.now();
        try {
          logServerMessage(`Attempting model: ${modelId}`, 'info');
          
          const requestData = {
            inputs: prompt,
            parameters: {
              negative_prompt: 'blurry, low quality, distorted, ugly, bad anatomy, text, watermark',
              num_inference_steps: 30,
              guidance_scale: 7.5,
            },
          };
          
          // Use the prompt directly (it's already optimized for Stable Diffusion)
          const response = await fetch(
            `https://api-inference.huggingface.co/models/${modelId}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            const attemptDuration = Date.now() - attemptStartTime;
            
            // Check if model is loading (common with free tier)
            if (response.status === 503 || errorText.includes('loading')) {
              logServerMessage(`Model ${modelId} is loading, trying next`, 'info');
              
              // Log failed attempt
              if (tracer) {
                tracer.addImageGenerationAttempt({
                  model: modelId,
                  prompt,
                  request: { prompt, model: modelId, options: requestData.parameters },
                  response: { success: false, error: 'Model loading' },
                  duration_ms: attemptDuration,
                  success: false,
                  error: 'Model loading (503)'
                });
              }
              continue;
            }
            
            // Log failed attempt
            if (tracer) {
              tracer.addImageGenerationAttempt({
                model: modelId,
                prompt,
                request: { prompt, model: modelId, options: requestData.parameters },
                response: { success: false, error: errorText },
                duration_ms: attemptDuration,
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
              });
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          // Get image as blob
          const imageBlob = await response.blob();
          
          // Convert blob to base64
          const arrayBuffer = await imageBlob.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const attemptDuration = Date.now() - attemptStartTime;
          
          if (base64Data && base64Data.length > 0) {
            logServerMessage('✓ Image generated successfully with Hugging Face!', 'info', { 
              model: modelId,
              dataSize: base64Data.length
            });
            
            // Log successful attempt
            if (tracer) {
              tracer.addImageGenerationAttempt({
                model: modelId,
                prompt,
                request: { prompt, model: modelId, options: requestData.parameters },
                response: { success: true, dataSize: base64Data.length },
                duration_ms: attemptDuration,
                success: true
              });
            }
            
            return base64Data;
          }
          
          logServerMessage(`Model ${modelId} responded but no image data`, 'warning');
          
          // Log failed attempt (no data)
          if (tracer) {
            tracer.addImageGenerationAttempt({
              model: modelId,
              prompt,
              request: { prompt, model: modelId, options: requestData.parameters },
              response: { success: false, error: 'No image data in response' },
              duration_ms: attemptDuration,
              success: false,
              error: 'No image data'
            });
          }
          
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message || error?.toString() || 'Unknown error';
          const attemptDuration = Date.now() - attemptStartTime;
          
          // Log failed attempt (exception)
          if (tracer && !error?.message?.includes('HTTP')) {
            tracer.addImageGenerationAttempt({
              model: modelId,
              prompt,
              request: { prompt, model: modelId },
              response: { success: false, error: errorMsg },
              duration_ms: attemptDuration,
              success: false,
              error: errorMsg
            });
          }
          logServerMessage(`Model ${modelId} failed: ${errorMsg}`, 'warning');
          continue;
        }
      }
      
      // All models failed
      logServerMessage('All Hugging Face models failed to generate image', 'error', { 
        attemptedModels: this.modelsToTry.length
      });
      
      throw lastError || new Error('No models could generate images - all attempts failed');
      
    } catch (error) {
      logServerError(error as Error, { 
        operation: 'huggingface_image_generation', 
        prompt: prompt.substring(0, 100) 
      });
      throw new Error(`Hugging Face failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create and return a Hugging Face provider instance
 */
export function createHuggingFaceProvider(): HuggingFaceImageProvider {
  return new HuggingFaceImageProvider();
}

