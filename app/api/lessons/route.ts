import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateLessonWithTracing, getDefaultProvider, getAvailableProviders, type LessonGenerationOptions } from "@/lib/llm";
import { logServerError, logServerMessage, withSentryErrorHandling, withSpan } from "@/lib/sentry";
import { parseMarkdownToStructure, generateLessonTypeScriptComponent, type LessonStructure } from "@/lib/lesson-typescript-generator";
import { extractImagePromptsFromContent, generateImagesInParallel } from "@/lib/llm/image-generation";
import { uploadImagesInParallel } from "@/lib/supabase/storage";
import { ImageTracer } from "@/lib/image-tracing";

export const GET = withSentryErrorHandling(async () => {
  return withSpan("api.lessons.get", "http.server", async () => {
    try {
      logServerMessage("Fetching lessons", "info");
      
      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        logServerMessage("Supabase environment variables not set", "warning");
        return NextResponse.json({ lessons: [] }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
      }

      const supabase = createServiceClient();
      
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logServerError(error as Error, { operation: "fetch_lessons" });
        return NextResponse.json({ error: "Failed to fetch lessons" }, { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
      }

      logServerMessage(`Successfully fetched ${lessons?.length || 0} lessons`, "info");
      return NextResponse.json({ lessons: lessons || [] }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    } catch (error) {
      logServerError(error as Error, { operation: "fetch_lessons" });
      return NextResponse.json({ error: "Internal server error" }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
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
      let lessonStructure = parseMarkdownToStructure(generatedLesson.content, lessonId);
      
      // Generate images if requested (reading and visual learning style)
      // IMPORTANT: We WAIT for images to complete before marking lesson as "generated"
      // BUT if images fail, we still mark as "generated" with a flag
      let generatedImageData: any[] = [];
      let imageGenerationFailed = false;
      let imageGenerationError = '';
      // Check if any image generation provider is available
      const shouldGenerateImages = options.learningStyle === 'reading and visual' && 
                                    (process.env.HUGGINGFACE_API_KEY || process.env.IMAGEROUTERIO_API_KEY || true); // Pollinations is always available
      
      if (shouldGenerateImages) {
        logServerMessage("Starting image generation - lesson will wait for completion", "info", {
          lessonId
        });
        
        // Create image tracer
        const imageTracer = new ImageTracer(lessonId);
        
        try {
          // Extract prompts from content (dynamic based on Visual Aid hints)
          const imagePrompts = await extractImagePromptsFromContent(
            generatedLesson.content
          );
          
          logServerMessage("Image prompts extracted", "info", {
            lessonId,
            numberOfImages: imagePrompts.length,
            prompts: imagePrompts.map(p => ({ prompt: p.prompt.substring(0, 50), visualAidLine: p.visualAidLine.substring(0, 60) }))
          });
          
          // Start trace
          await imageTracer.startTrace({
            lessonId,
            numberOfImages: imagePrompts.length,
            prompts: imagePrompts.map(p => ({ 
              prompt: p.prompt,
              visualAidLine: p.visualAidLine
            })),
            contentLength: generatedLesson.content.length
          });
          
          // Generate images in parallel - WAIT for all to complete
          const generatedImages = await generateImagesInParallel(imagePrompts, imageTracer);
          
          // No images is OK if no Visual Aid hints were found
          if (generatedImages.length === 0) {
            logServerMessage("No images generated - likely no Visual Aid hints in content", "info", { lessonId });
            // Continue without images - don't throw error
          }
          
          logServerMessage("Images generated successfully, uploading to storage", "info", {
            lessonId,
            count: generatedImages.length,
            expected: imagePrompts.length
          });
          
          // Upload images to Supabase Storage in parallel - WAIT for all uploads
          const uploadData = generatedImages.map((img, index) => ({
            base64Data: img.base64Data,
            index
          }));
          
          const imageUrls = await uploadImagesInParallel(uploadData, lessonId);
          
          // Create image metadata for storage and lesson structure
          generatedImages.forEach((img, index) => {
            const url = imageUrls[index];
            if (url) {
              // Store in generated_images array for database
              generatedImageData.push({
                url,
                prompt: img.prompt
              });
              
              // Add to lesson structure media array
              const mediaId = `generated-image-${index}`;
              // Always use full-width for block display (no floating text)
              const mediaPosition = 'full-width';
              
              lessonStructure.media.push({
                id: mediaId,
                type: 'image',
                url,
                alt: `Generated illustration: ${img.prompt.substring(0, 100)}`,
                caption: `AI-generated visualization`,
                position: mediaPosition as 'inline' | 'float-left' | 'float-right' | 'full-width'
              });
              
              // Search ALL sections for the Visual Aid line and insert image
              const visualAidLine = img.visualAidLine;
              let inserted = false;
              
              logServerMessage(`Processing image ${index + 1}/${generatedImages.length}`, 'info', {
                imageNumber: index + 1,
                mediaId,
                visualAidLine: visualAidLine.substring(0, 60),
                promptPreview: img.prompt.substring(0, 80),
                totalSections: lessonStructure.sections.length
              });
              
              // Search all sections for the Visual Aid line
              for (const section of lessonStructure.sections) {
                // Escape special regex characters
                const escapedLine = visualAidLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const match = section.content.match(new RegExp(escapedLine));
                
                if (match) {
                  // Found it! Insert image right after this line
                  const matchEnd = match.index! + match[0].length;
                  const textAfter = section.content.substring(matchEnd);
                  const newlineIdx = textAfter.indexOf('\n');
                  const lineEnd = matchEnd + (newlineIdx >= 0 ? newlineIdx : textAfter.length);
                  
                  section.content = 
                    section.content.substring(0, lineEnd) + 
                    `\n\n[IMAGE:${mediaId}]` + 
                    section.content.substring(lineEnd);
                  
                  inserted = true;
                  logServerMessage(`Image ${index + 1} placed after Visual Aid in section`, 'info', {
                    mediaId,
                    sectionId: section.id
                  });
                  break;
                }
              }
              
              if (!inserted) {
                logServerMessage(`Visual Aid not found for image ${index + 1}`, 'warning', { 
                  visualAidLine: visualAidLine.substring(0, 60) 
                });
              }
            }
          });
          
          // No images uploaded is OK if none were generated
          if (generatedImageData.length === 0 && generatedImages.length === 0) {
            logServerMessage("No images to upload - lesson will be text-only", "info", { lessonId });
          } else if (generatedImageData.length === 0 && generatedImages.length > 0) {
            throw new Error('Failed to upload images to storage');
          }
          
          logServerMessage("All images uploaded successfully - lesson ready", "info", {
            lessonId,
            successCount: generatedImageData.length,
            expected: imagePrompts.length
          });
          
          // Complete trace successfully
          await imageTracer.completeTrace({
            generatedImagesCount: generatedImages.length,
            uploadedImagesCount: generatedImageData.length,
            imageUrls: generatedImageData.map(img => img.url)
          }, imageTracer['modelsTried'] ? Array.from(imageTracer['modelsTried'])[0] || 'unknown' : 'unknown');
          
        } catch (imageError) {
          // Fail trace
          await imageTracer.failTrace(
            imageError instanceof Error ? imageError.message : 'Unknown error'
          );
          // If images fail, DON'T error the lesson - just mark that images failed
          imageGenerationFailed = true;
          imageGenerationError = imageError instanceof Error ? imageError.message : 'Unknown error';
          
          logServerError(imageError as Error, {
            lessonId,
            operation: "image_generation"
          });
          
          logServerMessage("Image generation failed - continuing with text-only lesson", "warning", {
            lessonId,
            error: imageGenerationError,
            willStillGenerateLesson: true
          });
          
          // Continue to TypeScript generation - don't return early
        }
      }
      
      // Generate TypeScript component from structure
      // This only runs AFTER images are complete (or skipped)
      const tsResult = generateLessonTypeScriptComponent(lessonStructure);
      
      if (!tsResult.success) {
        logServerMessage("TypeScript generation failed, saving without TS", "warning", {
          lessonId,
          errors: tsResult.errors
        });
      }
      
      const supabase = createServiceClient();
      
      // Add metadata to lesson structure about image generation
      if (imageGenerationFailed) {
        lessonStructure.metadata = lessonStructure.metadata || {};
        lessonStructure.metadata.imageGenerationFailed = true;
        lessonStructure.metadata.imageGenerationError = imageGenerationError;
      }
      
      // Update lesson with COMPLETE content
      // Status is set to "generated" even if images failed (text content is still good)
      await supabase
        .from("lessons")
        .update({
          status: "generated", // Set to generated even if images failed
          content: generatedLesson.content,
          title: generatedLesson.title,
          typescript_code: tsResult.success ? tsResult.tsCode : null,
          javascript_code: tsResult.success ? tsResult.jsCode : null,
          lesson_structure: lessonStructure,
          generated_images: generatedImageData,
        })
        .eq("id", lessonId);
      
      logServerMessage("Successfully generated complete lesson", "info", {
        lessonId,
        title: generatedLesson.title,
        contentLength: generatedLesson.content.length,
        sectionsCount: lessonStructure.sections.length,
        mediaCount: lessonStructure.media.length,
        generatedImagesCount: generatedImageData.length,
        typescriptGenerated: tsResult.success,
        hadImages: shouldGenerateImages,
        imagesFailed: imageGenerationFailed
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

