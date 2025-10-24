"use client";

import { DynamicLessonRenderer } from "@/components/dynamic-lesson-renderer";
import { type LessonStructure } from "@/lib/lesson-typescript-generator";

interface ClientLessonRendererProps {
  lessonId: string;
  isAdmin: boolean;
}

export function ClientLessonRenderer({ lessonId, isAdmin }: ClientLessonRendererProps) {
  const handleLessonUpdate = async (updatedStructure: LessonStructure) => {
    console.log('Lesson structure updated:', updatedStructure);
    // This will be handled by the DynamicLessonRenderer component
  };

  return (
    <DynamicLessonRenderer 
      lessonId={lessonId}
      editable={isAdmin}
      onUpdate={handleLessonUpdate}
    />
  );
}
