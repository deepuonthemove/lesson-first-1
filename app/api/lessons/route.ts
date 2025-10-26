import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateLessonWithTracing, getDefaultProvider, getAvailableProviders, type LessonGenerationOptions } from "@/lib/llm";
import { logServerError, logServerMessage, withSentryErrorHandling, withSpan } from "@/lib/sentry";
import { parseMarkdownToStructure, generateLessonTypeScriptComponent } from "@/lib/lesson-typescript-generator";

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
        gradeLevel = '2',
        sections = 4,
        learningStyle = 'reading',
        includeExamples = true,
        includeExercises = true 
      } = await request.json();

      logServerMessage("Creating new lesson", "info", {
        outline: outline?.substring(0, 100),
        gradeLevel,
        sections,
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
        gradeLevel,
        sections,
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
        gradeLevel: options.gradeLevel,
        sections: options.sections,
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
      
      logServerMessage("LLM generation complete, starting TypeScript conversion", "info", {
        lessonId,
        contentLength: generatedLesson.content.length
      });
      
      // Parse markdown to structured lesson format
      const lessonStructure = parseMarkdownToStructure(generatedLesson.content, lessonId);
      
      // Generate TypeScript component from structure
      const tsResult = generateLessonTypeScriptComponent(lessonStructure);
      
      if (!tsResult.success) {
        logServerMessage("TypeScript generation failed, saving without TS", "warning", {
          lessonId,
          errors: tsResult.errors
        });
      }
      
      const supabase = createServiceClient();
      
      // Update lesson with generated content and TypeScript
      await supabase
        .from("lessons")
        .update({
          status: "generated",
          content: generatedLesson.content,
          title: generatedLesson.title,
          typescript_code: tsResult.success ? tsResult.tsCode : null,
          javascript_code: tsResult.success ? tsResult.jsCode : null,
          lesson_structure: lessonStructure,
        })
        .eq("id", lessonId);
      
      logServerMessage("Successfully generated lesson with TypeScript", "info", {
        lessonId,
        title: generatedLesson.title,
        contentLength: generatedLesson.content.length,
        sectionsCount: lessonStructure.sections.length,
        mediaCount: lessonStructure.media.length,
        typescriptGenerated: tsResult.success
      });
    } catch (error) {
      logServerError(error as Error, {
        lessonId,
        operation: "lesson_generation",
        outline: options.outline.substring(0, 100),
        gradeLevel: options.gradeLevel,
        sections: options.sections,
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

