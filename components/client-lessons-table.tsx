"use client";

import { useState, useEffect } from "react";
import { LessonsTable, Lesson } from "@/components/lessons-table";
import { useRouter } from "next/navigation";

interface ClientLessonsTableProps {
  lessons: Lesson[];
}

export function ClientLessonsTable({ lessons: initialLessons }: ClientLessonsTableProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [, setDeletingLessonId] = useState<string | null>(null);
  const router = useRouter();

  // Update local state when props change (e.g., after refresh)
  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  const handleLessonDeleted = async (lessonId: string) => {
    setDeletingLessonId(lessonId);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Optimistically remove the lesson from UI immediately
      setLessons((prevLessons) => prevLessons.filter((lesson) => lesson.id !== lessonId));
      
      // Then refresh to sync with server
      router.refresh();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson. Please try again.');
      // Revert the optimistic update on error
      setLessons(initialLessons);
    } finally {
      setDeletingLessonId(null);
    }
  };

  return (
    <LessonsTable 
      lessons={lessons} 
      onLessonDeleted={handleLessonDeleted}
    />
  );
}
