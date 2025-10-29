"use client";

import { useState, useCallback } from "react";
import { ClientLessonGenerationForm } from "@/components/client-lesson-generation-form";
import { ClientLessonsTable } from "@/components/client-lessons-table";
import { Lesson } from "@/components/lessons-table";

interface LessonCoordinatorProps {
  lessons: Lesson[];
}

export function LessonCoordinator({ lessons }: LessonCoordinatorProps) {
  const [optimisticLessonAdded, setOptimisticLessonAdded] = useState<((lesson: Lesson) => void) | null>(null);
  const [lessonsUpdateCallback, setLessonsUpdateCallback] = useState<((lessons: Lesson[]) => void) | null>(null);

  const handleOptimisticLessonAdded = useCallback((callback: (lesson: Lesson) => void) => {
    setOptimisticLessonAdded(() => callback);
  }, []);

  const handleLessonsUpdateRequested = useCallback((callback: (lessons: Lesson[]) => void) => {
    setLessonsUpdateCallback(() => callback);
  }, []);

  return (
    <>
      <ClientLessonGenerationForm 
        onOptimisticLessonAdded={optimisticLessonAdded || undefined}
        onLessonsUpdate={lessonsUpdateCallback || undefined}
      />
      <ClientLessonsTable 
        lessons={lessons} 
        onOptimisticLessonAdded={handleOptimisticLessonAdded}
        onLessonsUpdateRequested={handleLessonsUpdateRequested}
      />
    </>
  );
}
