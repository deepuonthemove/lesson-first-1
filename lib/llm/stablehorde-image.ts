import { logServerMessage, logServerError } from '@/lib/sentry';
import { ImageTracer } from '@/lib/image-tracing';
import { ImageProvider } from './image-generation-common';

/**
 * Stable Horde Image Generation Provider
 * Free / community-driven image generation service (AI Horde / Stable Horde)
 * Requires API key: STABLEHORDE_API_KEY (optional but higher priority)
 */
export class StableHordeProvider implements ImageProvider {
  public name = 'aihorde.net';
  private apiKey?: string;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // min 1 second between submissions
  private readonly checkIntervalMs = 2000;    // poll interval 2 seconds
  private readonly maxAttempts = 60;           // ~2 minutes max wait

  constructor() {
    this.apiKey = process.env.STABLEHORDE_API_KEY;
  }

  isAvailable(): boolean {
    // If API key present, we treat as available. Could also allow no-key usage.
    return true;  // allow even without key; internal calls will warn if missing
  }

  async generateImage(prompt: string, tracer?: ImageTracer): Promise<string> {
    try {
      if (!this.apiKey) {
        logServerMessage('Warning: No STABLEHORDE_API_KEY provided — using anonymous mode (lower priority)', 'warning', { provider: this.name });
      }

      logServerMessage('Starting image generation (Stable Horde)', 'info', { prompt: prompt.substring(0, 100) });

      // rate-limit
      const now = Date.now();
      const since = now - this.lastRequestTime;
      if (since < this.minRequestInterval) {
        const wait = this.minRequestInterval - since;
        logServerMessage('Rate limiting: waiting before submitting', 'info', { wait });
        await new Promise(r => setTimeout(r, wait));
      }
      this.lastRequestTime = Date.now();

      const attemptStart = Date.now();

      const requestData = {
        prompt,
        params: {
          n: 1,
          width: 512,
          height: 512,
          steps: 25,
          cfg_scale: 7.5,
          sampler_name: 'k_euler_a'
        },
        models: ['Deliberate'],
        nsfw: false,
        trusted_workers: false,
        slow_workers: true,
        censor_nsfw: true,
        shared: false,
        r2: true
      };

      logServerMessage('Calling Stable Horde submit endpoint', 'info', { requestData });

      const submitResp = await fetch('https://aihorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: {
          'apikey': this.apiKey ?? '',
          'Content-Type': 'application/json',
          'Client-Agent': 'my-app/1.0'  // customize your client-agent
        },
        body: JSON.stringify(requestData)
      });

      if (!submitResp.ok) {
        const text = await submitResp.text();
        if (submitResp.status === 400) {
          throw new Error(`Stable Horde validation error: ${text}`);
        }
        if (submitResp.status === 401) {
          throw new Error('Stable Horde: Invalid API key');
        }
        if (submitResp.status === 403) {
          throw new Error(`Stable Horde: Forbidden — ${text}`);
        }
        if (submitResp.status === 429) {
          throw new Error(`Stable Horde: Rate limit/exceeded — ${text}`);
        }
        throw new Error(`Stable Horde: Submit failed HTTP ${submitResp.status}: ${text}`);
      }

      const submitJson = await submitResp.json();
      const generationId = submitJson.id;
      if (!generationId) {
        throw new Error('Stable Horde: No generation ID returned');
      }

      logServerMessage('Generation submitted', 'info', { generationId, kudos: submitJson.kudos });

      // Polling for completion
      for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, this.checkIntervalMs));
        const checkResp = await fetch(`https://aihorde.net/api/v2/generate/check/${generationId}`, {
          headers: {
            'apikey': this.apiKey ?? '',
            'Client-Agent': 'my-app/1.0'
          }
        });
        if (!checkResp.ok) {
          throw new Error(`Stable Horde: Check status failed HTTP ${checkResp.status}`);
        }
        const checkJson = await checkResp.json();
        if (checkJson.done) {
          // get full result
          const statusResp = await fetch(`https://aihorde.net/api/v2/generate/status/${generationId}`, {
            headers: {
              'apikey': this.apiKey ?? '',
              'Client-Agent': 'my-app/1.0'
            }
          });
          if (!statusResp.ok) {
            throw new Error(`Stable Horde: Status fetch failed HTTP ${statusResp.status}`);
          }
          const statusJson = await statusResp.json();
          const gens = statusJson.generations;
          if (gens && gens.length > 0) {
            const gen = gens[0];
            let base64Data: string;
            if (gen.img) {
              base64Data = gen.img;
            } else if (gen.url) {
              const imgResp = await fetch(gen.url);
              if (!imgResp.ok) {
                throw new Error(`Stable Horde: Download image failed HTTP ${imgResp.status}`);
              }
              const buffer = await imgResp.arrayBuffer();
              base64Data = Buffer.from(buffer).toString('base64');
            } else {
              throw new Error('Stable Horde: No image data nor URL in generation result');
            }

            const duration = Date.now() - attemptStart;
            logServerMessage('Image generated successfully', 'info', { generationId, duration, model: gen.model });

            if (tracer) {
              tracer.addImageGenerationAttempt({
                model: gen.model || 'stablehorde',
                prompt,
                request: { 
                  prompt, 
                  model: gen.model || 'stablehorde',
                  options: requestData 
                },
                response: { success: true, dataSize: base64Data.length },
                duration_ms: duration,
                success: true
              });
            }

            return base64Data;
          }
          throw new Error('Stable Horde: Completed but no generations returned');
        }
        if (checkJson.faulted) {
          throw new Error(`Stable Horde: Generation faulted (ID: ${generationId})`);
        }
        // optional: log every N attempts
        if (attempt % 10 === 0) {
          logServerMessage('Still waiting for generation', 'info', { generationId, attempt, queue_position: checkJson.queue_position });
        }
      }
      throw new Error('Stable Horde: Generation timed out');
    } catch (err) {
      logServerError(err as Error, { provider: this.name, prompt: prompt.substring(0, 100) });
      throw new Error(`Stable Horde failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}

export function createStableHordeProvider(): StableHordeProvider {
  return new StableHordeProvider();
}
