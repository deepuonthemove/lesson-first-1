# Vercel Deployment Checklist

## ❌ Issue: New Lessons Not Getting Generated

### Quick Debug Steps

1. **Check Vercel Deployment Logs**
   - Go to: https://vercel.com/deepuonthemoves-projects
   - Click on your deployment
   - Click "Functions" tab
   - Look for errors in the logs

2. **Check Browser Console**
   - Open: https://lesson-first-1-h64p4c4wy-deepuonthemoves-projects.vercel.app/
   - Open browser DevTools (F12)
   - Go to Console tab
   - Try to create a lesson
   - Look for any error messages

3. **Check Network Tab**
   - Open DevTools → Network tab
   - Try to create a lesson
   - Look at the POST request to `/api/lessons`
   - Check the response status and error message

---

## Required Environment Variables in Vercel

You need to set these in **Vercel Dashboard → Settings → Environment Variables**:

### 🔴 Critical (Required)

```bash
# Supabase Connection (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# At least ONE LLM Provider (REQUIRED)
GEMINI_API_KEY=AIza...           # Google Gemini (recommended)
# OR
GROQ_API_KEY=gsk_...             # Groq (fast)
# OR
OPENAI_API_KEY=sk-...            # OpenAI
# OR
ANTHROPIC_API_KEY=sk-ant-...     # Claude
```

### 🟡 Optional (For Image Generation)

```bash
# Image providers - Pollinations works without any keys!
# These are OPTIONAL for fallback
IMAGEROUTERIO_API_KEY=your_key   # Optional
HUGGINGFACE_API_KEY=hf_...       # Optional
```

### 🟢 Optional (For Advanced Features)

```bash
# Sentry (error tracking)
SENTRY_AUTH_TOKEN=your_token
NEXT_PUBLIC_SENTRY_DSN=https://...

# Other LLM providers (optional backups)
QWEN_API_KEY=your_key
HUGGINGFACE_LLM_API_KEY=your_key
OLLAMA_BASE_URL=http://...
```

---

## How to Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/deepuonthemoves-projects
2. Click on your project: `lesson-first-1-h64p4c4wy`
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### Step 2: Add Each Variable
For each required variable:
1. Click **Add New**
2. **Name**: Enter the variable name (e.g., `GEMINI_API_KEY`)
3. **Value**: Paste the value
4. **Environment**: Select **Production**, **Preview**, and **Development**
5. Click **Save**

### Step 3: Redeploy
After adding all variables:
1. Go to **Deployments** tab
2. Click the **3 dots** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

---

## Common Issues & Solutions

### 1. "Environment variables not set" Error

**Problem:** Vercel doesn't have the environment variables

**Solution:**
```bash
# Check which variables are missing from the error logs
# Add them in Vercel Dashboard → Settings → Environment Variables
# Redeploy after adding
```

### 2. "No LLM providers available" Error

**Problem:** No LLM API keys configured

**Solution:**
```bash
# Add at least ONE of these to Vercel:
GEMINI_API_KEY=AIza...        # Recommended (free tier)
GROQ_API_KEY=gsk_...          # Alternative (fast, free)
OPENAI_API_KEY=sk-...         # Alternative (paid)
```

### 3. "Supabase connection failed" Error

**Problem:** Supabase variables not set or incorrect

**Solution:**
```bash
# Double-check these 3 variables in Vercel:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Get them from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
```

### 4. "Function timeout" Error

**Problem:** Vercel serverless function timing out (default 10s)

**Solution:**
- Upgrade Vercel plan for longer timeouts
- Or: Reduce number of sections in lessons
- Or: Use faster LLM provider (Groq)

### 5. Build Fails

**Problem:** TypeScript errors or missing dependencies

**Solution:**
```bash
# Test build locally first:
npm run build

# If it works locally but fails on Vercel:
# - Clear Vercel build cache (Settings → General → Clear Cache)
# - Redeploy
```

---

## Testing Steps

### 1. Check Basic Connectivity
Visit: https://lesson-first-1-h64p4c4wy-deepuonthemoves-projects.vercel.app/

**Expected:** Home page loads with "Create a New Lesson" button

### 2. Check API Health
Visit: https://lesson-first-1-h64p4c4wy-deepuonthemoves-projects.vercel.app/api/lessons

**Expected:** JSON response with empty lessons array or existing lessons

### 3. Try Creating a Lesson
1. Click "Create a New Lesson"
2. Fill in:
   - Outline: "Dogs and how they are loyal"
   - Grade: "1st Grade"
   - Sections: 4
   - Learning Style: "reading"
3. Click Generate
4. Watch for errors in:
   - Browser console (F12)
   - Vercel function logs

---

## Minimum Required Setup for Vercel

To get it working, you **MUST** have:

### In Vercel Environment Variables:

```bash
# 1. Supabase (3 variables)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# 2. At least ONE LLM provider
GEMINI_API_KEY=AIza...  # Get from https://aistudio.google.com/apikey
```

### In Supabase:
1. Database tables created (run `schema.sql`)
2. Storage bucket: `lesson-generated-images` (if using images)

---

## Debug Command

From Vercel Deployment → Functions → Click on `/api/lessons`:

Look for these error patterns:

```
❌ "NEXT_PUBLIC_SUPABASE_URL is not set"
   → Add Supabase URL to Vercel env vars

❌ "No LLM providers available"
   → Add at least one: GEMINI_API_KEY, GROQ_API_KEY, etc.

❌ "Failed to generate lesson"
   → Check the full error message in function logs
   → Usually means API key is invalid or quota exceeded

❌ "Relation 'lessons' does not exist"
   → Run schema.sql in Supabase SQL Editor
```

---

## Quick Fix Checklist

- [ ] Added `NEXT_PUBLIC_SUPABASE_URL` to Vercel
- [ ] Added `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` to Vercel
- [ ] Added at least one LLM API key (GEMINI_API_KEY recommended)
- [ ] Ran `schema.sql` in Supabase SQL Editor
- [ ] Redeployed in Vercel after adding variables
- [ ] Checked Vercel function logs for errors
- [ ] Tested in browser with DevTools open

---

## Get Help

### 1. Check Vercel Logs
```
Vercel Dashboard → Deployments → Latest → Functions → Click function → View logs
```

### 2. Check Browser Console
```
Open site → F12 → Console tab → Try creating lesson → Copy error
```

### 3. Common Error Messages

**"API key not valid"**
- Check the API key is copied correctly
- Check it's for the right service (Gemini vs OpenAI vs Groq)
- Try generating a new key

**"Network request failed"**
- Check Supabase project is active
- Check Supabase URL is correct
- Check Vercel deployment is live

**"Server error"**
- Check Vercel function logs
- Look for specific error message
- Usually means missing env var or API issue

---

## Next Steps

1. **Check Vercel function logs** - Find the exact error
2. **Add missing environment variables** - Start with Supabase + Gemini
3. **Redeploy** - After adding variables
4. **Test again** - Create a simple lesson

Need more help? Share the error message from:
- Vercel function logs, OR
- Browser console (F12)


