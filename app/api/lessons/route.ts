import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      console.warn("Supabase environment variables not set. Returning empty lessons array.");
      return NextResponse.json({ lessons: [] });
    }

    const supabase = createServiceClient();
    
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching lessons:", error);
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
    }

    return NextResponse.json({ lessons: lessons || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { outline } = await request.json();

    if (!outline || typeof outline !== "string" || outline.trim().length === 0) {
      return NextResponse.json({ error: "Lesson outline is required" }, { status: 400 });
    }

    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
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
      console.error("Error creating lesson:", error);
      return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
    }

    // Start lesson generation in the background
    generateLessonContent(lesson.id, outline);

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateLessonContent(lessonId: string, outline: string) {
  try {
    // Simulate lesson generation with a delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate lesson content based on the outline
    const generatedContent = generateLessonFromOutline(outline);
    
    const supabase = createServiceClient();
    
    await supabase
      .from("lessons")
      .update({
        status: "generated",
        content: generatedContent,
      })
      .eq("id", lessonId);
  } catch (error) {
    console.error("Error generating lesson content:", error);
    
    // Update lesson status to error
    const supabase = createServiceClient();
    await supabase
      .from("lessons")
      .update({
        status: "error",
      })
      .eq("id", lessonId);
  }
}

function generateLessonFromOutline(outline: string): string {
  // This is a simple mock lesson generator
  // In a real application, you would integrate with an AI service like OpenAI
  
  const sections = outline.split('\n').filter(line => line.trim().length > 0);
  
  let content = `# Lesson: ${outline.split('\n')[0]}\n\n`;
  
  content += `## Overview\n\n`;
  content += `This lesson covers: ${outline}\n\n`;
  
  sections.forEach((section, index) => {
    if (section.trim()) {
      content += `## ${index + 1}. ${section.trim()}\n\n`;
      content += `### Key Points\n\n`;
      content += `- Important concept related to ${section.trim()}\n`;
      content += `- Practical application of ${section.trim()}\n`;
      content += `- Common challenges and solutions\n\n`;
      
      content += `### Examples\n\n`;
      content += `Here are some examples to illustrate ${section.trim()}:\n\n`;
      content += `1. **Example 1**: A practical scenario demonstrating the concept\n`;
      content += `2. **Example 2**: Another real-world application\n\n`;
    }
  });
  
  content += `## Summary\n\n`;
  content += `In this lesson, we covered:\n\n`;
  sections.forEach((section, index) => {
    if (section.trim()) {
      content += `${index + 1}. ${section.trim()}\n`;
    }
  });
  
  content += `\n## Next Steps\n\n`;
  content += `- Practice the concepts covered in this lesson\n`;
  content += `- Apply what you've learned in real-world scenarios\n`;
  content += `- Explore related topics for deeper understanding\n`;
  
  return content;
}
