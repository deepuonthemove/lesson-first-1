"use client";

import { useState } from "react";
import { LessonGenerationForm } from "@/components/lesson-generation-form";
import { useRouter } from "next/navigation";

interface LessonGenerationOptions {
  outline: string;
  gradeLevel: '2' | '3' | '4' | '5' | '6' | '7' | '8';
  sections: number;
  learningStyle: 'reading and visual' | 'reading';
  includeExamples: boolean;
  includeExercises: boolean;
}

export function ClientLessonGenerationForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerateLesson = async (options: LessonGenerationOptions) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Immediately refresh the page to show the new lesson
        router.refresh();
        
        // Poll for updates every 2 seconds until generation is complete
        const pollForUpdates = async () => {
          try {
            const updateResponse = await fetch("/api/lessons");
            if (updateResponse.ok) {
              const updateData = await updateResponse.json();
              const updatedLessons = updateData.lessons || [];
              
              // Check if the lesson is still generating
              const currentLesson = updatedLessons.find((l: any) => l.id === data.lesson.id);
              if (currentLesson && currentLesson.status === "generating") {
                setTimeout(pollForUpdates, 2000);
              } else {
                setIsGenerating(false);
                // Refresh the page to show the completed lesson
                router.refresh();
              }
            }
          } catch (error) {
            console.error("Error polling for updates:", error);
            setIsGenerating(false);
            router.refresh();
          }
        };
        
        setTimeout(pollForUpdates, 2000);
      } else {
        console.error("Error generating lesson");
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Error generating lesson:", error);
      setIsGenerating(false);
    }
  };

  return (
    <LessonGenerationForm 
      onGenerate={handleGenerateLesson}
      isGenerating={isGenerating}
    />
  );
}
