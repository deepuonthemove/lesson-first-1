import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  parseMarkdownToStructure,
  generateLessonTypeScriptComponent,
  type LessonStructure
} from "@/lib/lesson-typescript-generator";

/**
 * GET /api/lessons/[id]/typescript
 * Generates TypeScript component from lesson content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    // Fetch lesson from database
    const supabase = createServiceClient();
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !lesson) {
      console.error("Lesson fetch error:", error);
      return NextResponse.json(
        { error: "Lesson not found", details: error?.message },
        { status: 404 }
      );
    }

    // If lesson already has structure, return it
    if (lesson.lesson_structure) {
      console.log("Returning existing lesson structure");
      return NextResponse.json({
        success: true,
        lessonStructure: lesson.lesson_structure,
        typescript: lesson.typescript_code,
        javascript: lesson.javascript_code
      });
    }

    // Check if lesson has content
    if (!lesson.content) {
      console.error("Lesson has no content:", id);
      return NextResponse.json(
        { error: "Lesson has no content to convert" },
        { status: 400 }
      );
    }

    console.log("Parsing markdown to structure for lesson:", id);
    
    // Parse markdown to structure
    const lessonStructure = parseMarkdownToStructure(lesson.content, lesson.id);

    console.log("Generating TypeScript component, sections:", lessonStructure.sections.length);

    // Generate TypeScript component
    const result = generateLessonTypeScriptComponent(lessonStructure);

    if (!result.success) {
      console.error("TypeScript generation failed:", result.errors);
      return NextResponse.json(
        { error: "Failed to generate TypeScript", details: result.errors },
        { status: 500 }
      );
    }

    console.log("Saving TypeScript to database");

    // Store generated TypeScript in database
    const { error: updateError } = await supabase
      .from("lessons")
      .update({
        typescript_code: result.tsCode,
        javascript_code: result.jsCode,
        lesson_structure: lessonStructure
      })
      .eq("id", id);

    if (updateError) {
      console.error("Database update error:", updateError);
      // Don't fail the request, just log it
    }

    return NextResponse.json({
      success: true,
      lessonStructure,
      typescript: result.tsCode,
      javascript: result.jsCode
    });

  } catch (error) {
    console.error("TypeScript generation error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lessons/[id]/typescript
 * Updates lesson structure and regenerates TypeScript
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    const { lessonStructure } = body as { lessonStructure: LessonStructure };

    if (!lessonStructure) {
      return NextResponse.json(
        { error: "Lesson structure is required" },
        { status: 400 }
      );
    }

    // Regenerate TypeScript component
    const result = generateLessonTypeScriptComponent(lessonStructure);

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to generate TypeScript", details: result.errors },
        { status: 500 }
      );
    }

    // Update database
    const supabase = createServiceClient();
    await supabase
      .from("lessons")
      .update({
        typescript_code: result.tsCode,
        javascript_code: result.jsCode,
        lesson_structure: lessonStructure,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      lessonStructure,
      typescript: result.tsCode,
      javascript: result.jsCode
    });

  } catch (error) {
    console.error("TypeScript update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

