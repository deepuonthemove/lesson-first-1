# Multi-Provider Image Generation System

## Overview

The image generation system now supports **3 providers** with automatic fallback:

1. **Pollinations.ai** (FREE, no API key) ⭐ **Recommended**
2. **ImageRouter.io** (requires `IMAGEROUTERIO_API_KEY`)
3. **Hugging Face** (requires `HUGGINGFACE_API_KEY`)

The system automatically tries providers in order until one succeeds!

## Provider Details

### 1. Pollinations.ai (Priority 1)
- ✅ **Completely FREE**
- ✅ **No API key required**
- ✅ **No rate limits**
- ✅ **Multiple models** (flux, flux-realism, turbo)
- ✅ **Good for educational content**
- 🔗 **Website:** https://pollinations.ai/

**Perfect for:**
- Quick prototyping
- Free tier usage
- Educational projects
- High volume generation

### 2. ImageRouter.io (Priority 2)
- 💳 **Requires API key:** `IMAGEROUTERIO_API_KEY`
- ✅ **Built-in model routing**
- ✅ **Automatic fallback**
- ✅ **Good performance**
- ✅ **Pay-as-you-go pricing**
- 🔗 **Website:** https://imagerouter.io/

**Perfect for:**
- Production applications
- When you need reliability
- Professional quality
- Budget-conscious projects

### 3. Hugging Face (Priority 3)
- 💳 **Requires API key:** `HUGGINGFACE_API_KEY`
- ✅ **FREE Inference API**
- ✅ **Multiple Stable Diffusion models**
- ⚠️ **May have model loading delays** (free tier)
- ✅ **Good for educational content**
- 🔗 **Website:** https://huggingface.co/

**Perfect for:**
- Educational content
- Testing different models
- Free tier usage
- Fallback option

## Setup

### Quick Start (No API Key Needed!)

**Pollinations.ai works out of the box - nothing to configure!**

Just set `learningStyle: 'reading and visual'` and image generation will work automatically.

### Optional: Add More Providers

#### ImageRouter.io Setup
1. Sign up at https://imagerouter.io/
2. Get your API key from the dashboard
3. Add to `.env.local`:
```bash
IMAGEROUTERIO_API_KEY=your_api_key_here
```

#### Hugging Face Setup
1. Create account at https://huggingface.co/
2. Go to Settings → Access Tokens
3. Create a new token with "read" permission
4. Add to `.env.local`:
```bash
HUGGINGFACE_API_KEY=hf_...
```

## How It Works

### Automatic Fallback Chain

```
1. Try Pollinations.ai
   └─ Success? ✅ Return image
   └─ Fail? → Try next

2. Try ImageRouter.io (if API key set)
   └─ Success? ✅ Return image
   └─ Fail? → Try next

3. Try Hugging Face (if API key set)
   └─ Success? ✅ Return image
   └─ Fail? ❌ Error
```

### Logging

All provider attempts are logged:
```javascript
Image generation providers available {
  count: 3,
  providers: ['pollinations.ai', 'imagerouter.io', 'huggingface']
}

Trying image generation with pollinations.ai
✓ Successfully generated image with pollinations.ai
```

### Image Tracing

All attempts are tracked in the image traces:
```javascript
{
  "model": "pollinations-flux",
  "duration_ms": 2341,
  "success": true,
  "response": { "dataSize": 245123 }
}
```

## File Structure

### New Architecture

```
lib/llm/
├── image-generation-common.ts    # Shared utilities & interfaces
├── image-generation.ts           # Orchestrator with fallback logic
├── pollinations-image.ts         # Pollinations.ai provider
├── imagerouter-image.ts          # ImageRouter.io provider
├── huggingface-image.ts          # Hugging Face provider (refactored)
└── gemini-image.ts               # ❌ DEPRECATED (kept for reference)
```

### What Changed

| File | Status |
|------|--------|
| `gemini-image.ts` | ❌ **DEPRECATED** (renamed to `huggingface-image.ts`) |
| `image-generation-common.ts` | ✅ **NEW** - Common utilities |
| `image-generation.ts` | ✅ **NEW** - Main orchestrator |
| `pollinations-image.ts` | ✅ **NEW** - Pollinations provider |
| `imagerouter-image.ts` | ✅ **NEW** - ImageRouter provider |
| `huggingface-image.ts` | ✅ **NEW** - Refactored from gemini-image.ts |

## Usage

### In Code

The API hasn't changed! Use the same functions:

```typescript
import { extractImagePromptsFromContent, generateImagesInParallel } from '@/lib/llm/image-generation';

// Extract prompts from content
const prompts = await extractImagePromptsFromContent(content, 2);

// Generate images (automatically uses available providers)
const images = await generateImagesInParallel(prompts, tracer);
```

### From UI

No changes needed! Just generate a lesson with:
- Learning Style: "reading and visual"
- Number of Images: 1 or 2

The system will automatically:
1. Try Pollinations.ai first (always available)
2. Fall back to ImageRouter.io if configured
3. Fall back to Hugging Face if configured

## Provider Comparison

| Feature | Pollinations | ImageRouter | Hugging Face |
|---------|-------------|-------------|--------------|
| **API Key Required** | ❌ No | ✅ Yes | ✅ Yes |
| **Cost** | FREE | Pay-per-use | FREE (with limits) |
| **Speed** | Fast | Fast | Can be slow (loading) |
| **Quality** | High | High | High |
| **Reliability** | High | Very High | Medium |
| **Models** | 3+ | Auto-routed | 6+ |
| **Rate Limits** | None | Per plan | Free tier limits |

## Recommendations

### For Development
Use **Pollinations.ai** - it's free and requires no setup!

### For Production
1. Use **Pollinations.ai** as primary (free!)
2. Add **ImageRouter.io** as backup for reliability
3. Add **Hugging Face** as final fallback

### For Cost-Conscious
1. Use **Pollinations.ai** only (completely free)
2. No API keys needed
3. Unlimited generation

### For Maximum Reliability
Configure all three providers:
```bash
# .env.local
IMAGEROUTERIO_API_KEY=your_key
HUGGINGFACE_API_KEY=hf_your_key
```

## Troubleshooting

### No Images Generated

Check logs to see which providers were tried:
```
Image generation providers available { count: 1, providers: ['pollinations.ai'] }
```

If only Pollinations is available, that's normal! It should work fine.

### All Providers Failed

Check error message:
```
All image generation providers failed. Last error: [error details]
```

**Solutions:**
1. Check internet connection
2. Try adding ImageRouter or Hugging Face API keys
3. Check provider status pages

### Provider-Specific Errors

#### Pollinations.ai
- Usually very reliable
- If fails, likely a network issue

#### ImageRouter.io
- Check API key is valid: `IMAGEROUTERIO_API_KEY`
- Check account has credits

#### Hugging Face
- Check API key is valid: `HUGGINGFACE_API_KEY`
- Free tier models may be "loading" - will retry automatically
- May be slow on first request (cold start)

## Performance Tips

1. **Pollinations is fastest** - use it as primary
2. **ImageRouter provides best reliability** - good for production
3. **Hugging Face is FREE but can be slow** - good backup

## Migration from Old System

### Before (gemini-image.ts)
```typescript
import { generateImageWithGemini } from '@/lib/llm/gemini-image';

const image = await generateImageWithGemini(prompt);
```

### After (multi-provider)
```typescript
import { generateImagesInParallel } from '@/lib/llm/image-generation';

const images = await generateImagesInParallel(prompts, tracer);
```

**Changes:**
- ✅ Automatic provider selection
- ✅ Automatic fallback
- ✅ Works without any API keys (Pollinations)
- ✅ Same image quality
- ✅ Better reliability

## Testing

Generate a lesson with images and check the terminal:

```bash
Image generation providers available {
  count: 3,
  providers: ['pollinations.ai', 'imagerouter.io', 'huggingface']
}

Trying image generation with pollinations.ai
  Attempting Pollinations model: flux
  ✓ Image generated successfully with Pollinations.ai!

✓ Successfully generated 2 images with pollinations.ai
```

## Future Enhancements

Possible additions:
- DALL-E 3 provider
- Stable Diffusion XL local
- Midjourney API (when available)
- Custom provider interface

## Summary

✅ **3 providers** with automatic fallback  
✅ **FREE option** available (Pollinations.ai)  
✅ **No API key required** to get started  
✅ **Automatic provider selection**  
✅ **Complete error handling**  
✅ **Full image tracing support**  
✅ **Backwards compatible** with existing code  

**Get started in 0 seconds - Pollinations.ai works out of the box!** 🚀

