import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateLessonWithTracing, getDefaultProvider, getAvailableProviders, type LessonGenerationOptions } from "@/lib/llm";
import { logServerError, logServerMessage, withSentryErrorHandling, withSpan } from "@/lib/sentry";

export const GET = withSentryErrorHandling(async () => {
  return withSpan("api.lessons.get", "http.server", async () => {
    try {
      logServerMessage("Fetching lessons", "info");
      
      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        logServerMessage("Supabase environment variables not set", "warning");
        return NextResponse.json({ lessons: [] });
      }

      const supabase = createServiceClient();
      
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logServerError(error as Error, { operation: "fetch_lessons" });
        return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
      }

      logServerMessage(`Successfully fetched ${lessons?.length || 0} lessons`, "info");
      return NextResponse.json({ lessons: lessons || [] });
    } catch (error) {
      logServerError(error as Error, { operation: "fetch_lessons" });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
});

export const POST = withSentryErrorHandling(async (request: NextRequest) => {
  return withSpan("api.lessons.post", "http.server", async () => {
    try {
      const { 
        outline, 
        difficulty = 'intermediate',
        duration = 30,
        learningStyle = 'reading',
        includeExamples = true,
        includeExercises = true 
      } = await request.json();

      logServerMessage("Creating new lesson", "info", {
        outline: outline?.substring(0, 100),
        difficulty,
        duration,
        learningStyle
      });

      if (!outline || typeof outline !== "string" || outline.trim().length === 0) {
        logServerMessage("Lesson outline validation failed", "warning");
        return NextResponse.json({ error: "Lesson outline is required" }, { status: 400 });
      }

      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        logServerMessage("Supabase environment variables not configured", "error");
        return NextResponse.json({ 
          error: "Supabase environment variables not configured. Please set up your .env.local file." 
        }, { status: 500 });
      }

      const supabase = createServiceClient();
      
      // Create a new lesson with "generating" status
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          title: outline.length > 50 ? outline.substring(0, 50) + "..." : outline,
          outline: outline.trim(),
          status: "generating",
          content: null,
        })
        .select()
        .single();

      if (error) {
        logServerError(error as Error, { operation: "create_lesson" });
        return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
      }

      logServerMessage("Lesson created successfully, starting generation", "info", { lessonId: lesson.id });

      // Start lesson generation in the background with LLM
      generateLessonContentWithLLM(lesson.id, {
        outline: outline.trim(),
        difficulty,
        duration,
        learningStyle,
        includeExamples,
        includeExercises
      });

      return NextResponse.json({ lesson });
    } catch (error) {
      logServerError(error as Error, { operation: "create_lesson" });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
});

async function generateLessonContentWithLLM(lessonId: string, options: LessonGenerationOptions) {
  return withSpan("lesson.generation", "task", async () => {
    try {
      logServerMessage("Starting LLM lesson generation", "info", {
        lessonId,
        outline: options.outline.substring(0, 100) + '...',
        difficulty: options.difficulty,
        duration: options.duration,
        learningStyle: options.learningStyle
      });
      
      // Get available providers for debugging
      const availableProviders = getAvailableProviders();
      logServerMessage("Available LLM providers", "info", { providers: availableProviders });
      
      if (availableProviders.length === 0) {
        const error = new Error('No LLM providers configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
        logServerError(error, { lessonId, operation: "lesson_generation" });
        throw error;
      }
      
      // Generate lesson content using LLM with automatic fallback and tracing
      const generatedLesson = await generateLessonWithTracing(options, { provider: getDefaultProvider() }, lessonId);
      
      const supabase = createServiceClient();
      
      // Update lesson with generated content
      await supabase
        .from("lessons")
        .update({
          status: "generated",
          content: generatedLesson.content,
          title: generatedLesson.title,
        })
        .eq("id", lessonId);
      
      logServerMessage("Successfully generated lesson", "info", {
        lessonId,
        title: generatedLesson.title,
        contentLength: generatedLesson.content.length
      });
    } catch (error) {
      logServerError(error as Error, {
        lessonId,
        operation: "lesson_generation",
        outline: options.outline.substring(0, 100),
        difficulty: options.difficulty,
        duration: options.duration,
        learningStyle: options.learningStyle
      });
      
      // Update lesson status to error
      const supabase = createServiceClient();
      await supabase
        .from("lessons")
        .update({
          status: "error",
        })
        .eq("id", lessonId);
    }
  });
}

