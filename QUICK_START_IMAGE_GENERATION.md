# Quick Start: Image Generation Feature

## 🚀 5-Minute Setup (100% FREE!)

### Step 1: Get FREE Hugging Face API Key
1. Create free account: https://huggingface.co/join
2. Go to tokens: https://huggingface.co/settings/tokens
3. Click "New token" → Name: "lesson-ai" → Role: "read"
4. Copy the token (starts with `hf_...`)

### Step 2: Add API Key to .env.local
```bash
# Add to .env.local
HUGGINGFACE_API_KEY=hf_your_token_here
```

### Step 3: Run Database Migration
In Supabase SQL Editor, run:
```bash
migrations/add-image-generation.sql
```

Or manually:
```sql
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS generated_images JSONB DEFAULT '[]'::jsonb;
```

### Step 4: Create Storage Bucket
In Supabase Dashboard → Storage:
- Click "New bucket"
- Name: `lesson-generated-images`
- ✅ Check "Public bucket"
- Click "Create bucket"

### Step 5: Restart Dev Server
```bash
npm run dev
```

### Step 6: Test It!
1. Go to http://localhost:3000
2. Enter lesson outline (e.g., "The Solar System")
3. Select "Reading and Visual" learning style
4. Choose "1 Image" or "2 Images"
5. Click "Generate Lesson with AI"
6. Wait 15-45 seconds (models may need to "warm up" on first use)
7. View lesson with AI-generated images! 🎨

**Using FREE Stable Diffusion models from Hugging Face!**

---

## ✨ How to Use

### Generate Lesson with Images
1. Fill in lesson outline
2. Choose grade level
3. Select **"Reading and Visual"** 
4. **New dropdown appears** → Select 1 or 2 images
5. Click "Generate Lesson with AI"

### What Happens
- Lesson text generated first (2-5 sec)
- Key concepts extracted automatically
- Images generated with FREE Stable Diffusion (10-30 sec)
- Uploaded to Supabase Storage
- Displayed in rendered lesson

**Note:** First image may take 20-30 seconds as models "warm up" (free tier). Subsequent images are faster!

---

## 🎯 What You Get

### 1 Image
- Full-width display
- Generated from entire lesson content
- Prominently positioned

### 2 Images  
- First image: float-right (from first half)
- Second image: float-left (from second half)
- Content flows naturally around them

---

## ❓ Troubleshooting

### Images not generating?
```bash
# Check if API key is set
echo $HUGGINGFACE_API_KEY

# Verify in .env.local
cat .env.local | grep HUGGINGFACE
```

### "Bucket not found" error?
Create bucket manually (see Step 3 above)

### Images generate but don't show?
Make sure bucket is **PUBLIC** in Supabase Storage settings.

### Images taking a long time?
Free tier models may take 20-30 seconds to "warm up" on first request. This is normal! Check server logs to see progress.

---

## 📚 Full Documentation

- **Complete Setup:** [IMAGE_GENERATION_SETUP.md](./IMAGE_GENERATION_SETUP.md)
- **What Changed:** [CHANGELOG-IMAGE-GENERATION.md](./CHANGELOG-IMAGE-GENERATION.md)  
- **General Setup:** [SETUP.md](./SETUP.md)

---

## 🎉 You're Done!

The feature is now fully operational. Try generating a lesson with images and see the magic happen!

**Pro Tip:** Check server logs to see the image generation process in real-time.

