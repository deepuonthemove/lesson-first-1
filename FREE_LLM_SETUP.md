# 🆓 Free LLM Providers Setup Guide

This application now supports **multiple free LLM providers** that don't charge any money! Here's how to set them up:

## 🚀 **Free LLM Providers Available**

### **1. Groq (Recommended - Fastest)**
- **Cost**: FREE (14,400 requests/day)
- **Speed**: Ultra-fast inference
- **Models**: Llama 3.1 70B, Mixtral 8x7B
- **Setup**: Get free API key at https://console.groq.com/

### **2. Google Gemini**
- **Cost**: FREE (15 requests/minute, 1M tokens/day)
- **Speed**: Fast
- **Models**: Gemini 1.5 Flash
- **Setup**: Get free API key at https://makersuite.google.com/app/apikey

### **3. Hugging Face**
- **Cost**: FREE (1,000 requests/month)
- **Speed**: Medium
- **Models**: Various open-source models
- **Setup**: Get free API key at https://huggingface.co/settings/tokens

### **4. Ollama (Local - Completely Free)**
- **Cost**: 100% FREE (runs locally)
- **Speed**: Depends on your hardware
- **Models**: Llama, Mistral, CodeLlama, etc.
- **Setup**: Install Ollama locally

## 🔧 **Quick Setup**

### **Option 1: Groq (Easiest)**
1. Go to https://console.groq.com/
2. Sign up for free
3. Get your API key
4. Add to `.env.local`:
```bash
GROQ_API_KEY=your_groq_api_key_here
```

### **Option 2: Google Gemini**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Create API key
4. Add to `.env.local`:
```bash
GOOGLE_API_KEY=your_google_api_key_here
```

### **Option 3: Hugging Face**
1. Go to https://huggingface.co/settings/tokens
2. Create account
3. Generate access token
4. Add to `.env.local`:
```bash
HUGGINGFACE_API_KEY=your_huggingface_token_here
```

### **Option 4: Ollama (Local)**
1. Install Ollama: https://ollama.ai/
2. Run: `ollama pull llama3.1:8b`
3. Start Ollama: `ollama serve`
4. Add to `.env.local` (optional):
```bash
OLLAMA_URL=http://localhost:11434
```

## 📋 **Complete .env.local Setup**

```bash
# Supabase Configuration (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# FREE LLM Providers (choose one or more)
# Groq (Recommended - Fastest & Free)
GROQ_API_KEY=your_groq_api_key_here

# Google Gemini (Free tier)
GOOGLE_API_KEY=your_google_api_key_here

# Hugging Face (Free tier)
HUGGINGFACE_API_KEY=your_huggingface_token_here

# Ollama (Local - 100% Free)
OLLAMA_URL=http://localhost:11434

# Optional: Paid providers as fallback
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## 🎯 **Provider Priority**

The system automatically prioritizes **free providers first**:

1. **Groq** (if configured) - Fastest free option
2. **Gemini** (if configured) - Google's free tier
3. **Hugging Face** (if configured) - Open source models
4. **Ollama** (if running) - Local models
5. **OpenAI** (if configured) - Paid fallback
6. **Anthropic** (if configured) - Paid fallback

## 🧪 **Testing Your Setup**

### **Test Configuration**
```bash
curl -X GET http://localhost:3000/api/llm-test
```

### **Test Lesson Generation**
```bash
curl -X POST http://localhost:3000/api/llm-test
```

## 📊 **Free Tier Limits**

| Provider | Free Requests | Tokens/Day | Speed |
|----------|---------------|------------|-------|
| **Groq** | 14,400/day | Unlimited | ⚡ Ultra-fast |
| **Gemini** | 15/min | 1M tokens | ⚡ Fast |
| **Hugging Face** | 1,000/month | 10M tokens | 🐌 Medium |
| **Ollama** | Unlimited | Unlimited | 🐌 Depends on hardware |

## 🚀 **Getting Started (No API Keys Required)**

### **Option 1: Use Ollama (100% Free)**
1. Install Ollama: https://ollama.ai/
2. Run: `ollama pull llama3.1:8b`
3. Start: `ollama serve`
4. That's it! No API keys needed.

### **Option 2: Get Groq API Key (5 minutes)**
1. Go to https://console.groq.com/
2. Sign up (free)
3. Copy API key
4. Add to `.env.local`
5. Restart your app

## 🔧 **Troubleshooting**

### **"No LLM providers configured"**
- Make sure you have at least one API key in `.env.local`
- Restart your development server after adding keys

### **Ollama not working**
- Make sure Ollama is running: `ollama serve`
- Check if model is installed: `ollama list`
- Install a model: `ollama pull llama3.1:8b`

### **API rate limits**
- Groq: 14,400 requests/day (very generous)
- Gemini: 15 requests/minute (wait between requests)
- Hugging Face: 1,000 requests/month (use sparingly)

## 🎉 **Benefits of Free Providers**

- **No costs** - Generate unlimited lessons
- **Fast inference** - Especially with Groq
- **Multiple fallbacks** - If one fails, tries others
- **Local options** - Ollama runs completely offline
- **High quality** - Modern models produce excellent content

## 📈 **Usage Tips**

1. **Start with Groq** - Fastest and most reliable free option
2. **Add Gemini** - Good backup with Google's infrastructure
3. **Use Ollama** - For completely offline usage
4. **Monitor usage** - Check your free tier limits
5. **Combine providers** - System automatically uses the best available

Your lesson generation will now be **completely free** while maintaining high quality! 🎉
