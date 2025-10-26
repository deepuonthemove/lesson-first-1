import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';
import { ImageProvider } from './image-generation-common';

/**
 * ImageRouter.io Image Generation Provider
 * Requires API key: IMAGEROUTERIO_API_KEY
 * 
 * Features:
 * - Routes to multiple models automatically
 * - Fallback handling built-in
 * - Good performance
 * - Pay-as-you-go pricing
 */
export class ImageRouterProvider implements ImageProvider {
  name = 'imagerouter.io';
  private apiKey: string | undefined;
  
  constructor() {
    this.apiKey = process.env.IMAGEROUTERIO_API_KEY;
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async generateImage(prompt: string, tracer?: ImageTracer): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('IMAGEROUTERIO_API_KEY environment variable is not set');
      }
      
      logServerMessage('Starting image generation with ImageRouter.io', 'info', { 
        prompt: prompt.substring(0, 100) 
      });
      
      const attemptStartTime = Date.now();
      
      const requestData = {
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 30,
        guidance_scale: 7.5,
        negative_prompt: 'blurry, low quality, distorted, ugly, bad anatomy, text, watermark'
      };
      
      logServerMessage('Calling ImageRouter.io API', 'info', {
        promptLength: prompt.length,
        options: requestData
      });
      
      // ImageRouter.io API endpoint
      const response = await fetch('https://api.imagerouter.io/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const attemptDuration = Date.now() - attemptStartTime;
        const errorText = await response.text();
        
        if (tracer) {
          tracer.addImageGenerationAttempt({
            model: 'imagerouter',
            prompt,
            request: { prompt, model: 'imagerouter', options: requestData },
            response: { success: false, error: errorText },
            duration_ms: attemptDuration,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`
          });
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      // Parse response - ImageRouter returns JSON with image data or URL
      const result = await response.json();
      const attemptDuration = Date.now() - attemptStartTime;
      
      let base64Data: string;
      
      // Handle different response formats
      if (result.image) {
        // Direct base64 image
        base64Data = result.image;
      } else if (result.url) {
        // Image URL - need to fetch it
        logServerMessage('ImageRouter returned URL, fetching image', 'info', { url: result.url });
        
        const imageResponse = await fetch(result.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
        }
        
        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        base64Data = Buffer.from(arrayBuffer).toString('base64');
      } else {
        throw new Error('Unexpected response format from ImageRouter.io');
      }
      
      if (base64Data && base64Data.length > 0) {
        logServerMessage('✓ Image generated successfully with ImageRouter.io!', 'info', { 
          dataSize: base64Data.length,
          duration: attemptDuration
        });
        
        if (tracer) {
          tracer.addImageGenerationAttempt({
            model: 'imagerouter',
            prompt,
            request: { prompt, model: 'imagerouter', options: requestData },
            response: { success: true, dataSize: base64Data.length },
            duration_ms: attemptDuration,
            success: true
          });
        }
        
        return base64Data;
      }
      
      throw new Error('No image data in response from ImageRouter.io');
      
    } catch (error) {
      logServerError(error as Error, { 
        operation: 'imagerouter_image_generation', 
        prompt: prompt.substring(0, 100) 
      });
      throw new Error(`ImageRouter.io failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create and return an ImageRouter provider instance
 */
export function createImageRouterProvider(): ImageRouterProvider {
  return new ImageRouterProvider();
}

