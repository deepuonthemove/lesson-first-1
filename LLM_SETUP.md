# LLM Setup Guide

This application now supports AI-powered lesson generation using Large Language Models (LLMs). Follow this guide to set up your preferred LLM provider.

## 🚀 Quick Setup

### 1. Choose Your LLM Provider

**Option A: OpenAI GPT-4 (Recommended)**
- Best quality and reliability
- Cost: ~$0.03/1K tokens (input), ~$0.06/1K tokens (output)
- Get API key: https://platform.openai.com/api-keys

**Option B: Anthropic Claude 3.5 Sonnet**
- Excellent quality, cost-effective
- Cost: ~$0.003/1K tokens (input), ~$0.015/1K tokens (output)
- Get API key: https://console.anthropic.com/

**Option C: Both (with fallback)**
- Set up both providers for automatic fallback
- If one fails, the system will try the other

### 2. Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# LLM API Keys (choose one or both)
# OpenAI API Key (recommended for best quality)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (alternative, cost-effective)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Specify which LLM provider to use by default
# Options: 'openai', 'anthropic'
# If not set, will use OpenAI if available, otherwise the first available provider
DEFAULT_LLM_PROVIDER=openai
```

### 3. Get Your API Keys

#### For OpenAI:
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and add it to your `.env.local` file

#### For Anthropic:
1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env.local` file

### 4. Restart Your Development Server

```bash
npm run dev
```

## 🎯 Features

### Advanced Lesson Generation Options

The new AI-powered system includes:

- **Difficulty Levels**: Beginner, Intermediate, Advanced
- **Duration Control**: Specify lesson length (10-120 minutes)
- **Learning Styles**: Visual, Auditory, Kinesthetic, Reading
- **Content Options**: Include examples and exercises
- **Automatic Fallback**: If one provider fails, tries another

### Generated Content Structure

Each AI-generated lesson includes:

1. **Compelling Title**: Auto-generated based on your outline
2. **Learning Objectives**: Clear goals for the lesson
3. **Structured Content**: Well-organized sections with explanations
4. **Practical Examples**: Real-world applications
5. **Key Concepts**: Highlighted important points
6. **Summary**: Recap of what was covered
7. **Next Steps**: Suggested follow-up activities

## 🔧 Troubleshooting

### Common Issues

**"LLM provider not configured" error:**
- Make sure you've added at least one API key to your `.env.local` file
- Restart your development server after adding the key

**"API key invalid" error:**
- Verify your API key is correct
- Check that you have sufficient credits/quota
- For OpenAI: Check your usage at https://platform.openai.com/usage
- For Anthropic: Check your usage at https://console.anthropic.com/

**Generation taking too long:**
- This is normal for the first request (cold start)
- Subsequent requests should be faster
- Check your internet connection

### Cost Management

**OpenAI Costs:**
- Typical lesson: ~$0.10-0.30 per lesson
- Monitor usage: https://platform.openai.com/usage

**Anthropic Costs:**
- Typical lesson: ~$0.05-0.15 per lesson
- Monitor usage: https://console.anthropic.com/

## 🚀 Advanced Configuration

### Customizing LLM Behavior

You can modify the lesson generation prompts in:
- `lib/llm/openai.ts` - OpenAI-specific prompts
- `lib/llm/anthropic.ts` - Anthropic-specific prompts

### Adding New Providers

To add support for additional LLM providers:

1. Create a new file in `lib/llm/` (e.g., `gemini.ts`)
2. Implement the same interface as the existing providers
3. Add the provider to the main `lib/llm/index.ts` file
4. Update the environment variables and configuration

## 📊 Monitoring

The application logs LLM usage and errors to the console. For production, consider:

- Adding proper logging (e.g., with Winston or Pino)
- Implementing usage tracking
- Setting up error monitoring (e.g., Sentry)
- Adding rate limiting for API calls

## 🎉 You're Ready!

Once you've set up your API keys, you can start generating AI-powered lessons with:

- Custom difficulty levels
- Personalized learning styles
- Rich, structured content
- Practical examples and exercises

The system will automatically choose the best available provider and handle fallbacks gracefully.
