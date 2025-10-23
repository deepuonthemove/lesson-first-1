import { NextResponse } from "next/server";
import { getAvailableProviders, generateLesson } from "@/lib/llm";

export async function GET() {
  try {
    const availableProviders = getAvailableProviders();
    
    return NextResponse.json({
      availableProviders,
      // Free providers
      qwenConfigured: !!process.env.HUGGINGFACE_API_KEY,
      groqConfigured: !!process.env.GROQ_API_KEY,
      geminiConfigured: !!process.env.GOOGLE_API_KEY,
      huggingfaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
      ollamaConfigured: !!process.env.OLLAMA_URL || process.env.NODE_ENV === 'development',
      // Paid providers
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      message: `Found ${availableProviders.length} configured LLM providers: ${availableProviders.join(', ')}`,
      freeProviders: availableProviders.filter(p => ['qwen', 'groq', 'gemini', 'huggingface', 'ollama'].includes(p)),
      paidProviders: availableProviders.filter(p => ['openai', 'anthropic'].includes(p))
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to check LLM configuration",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const availableProviders = getAvailableProviders();
    
    if (availableProviders.length === 0) {
      return NextResponse.json({ 
        error: "No LLM providers configured",
        message: "Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env.local file"
      }, { status: 400 });
    }

    // Test lesson generation with a simple outline
    const testOptions = {
      outline: "Test lesson about fallback mechanism",
      difficulty: 'beginner' as const,
      duration: 10,
      learningStyle: 'reading' as const,
      includeExamples: true,
      includeExercises: false
    };

    console.log("Testing LLM fallback with options:", testOptions);
    
    const result = await generateLesson(testOptions);
    
    return NextResponse.json({
      success: true,
      availableProviders,
      generatedTitle: result.title,
      contentLength: result.content.length,
      message: "LLM test successful"
    });
  } catch (error) {
    console.error("LLM test failed:", error);
    return NextResponse.json({ 
      error: "LLM test failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      availableProviders: getAvailableProviders()
    }, { status: 500 });
  }
}
