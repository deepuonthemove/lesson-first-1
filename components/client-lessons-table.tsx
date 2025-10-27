"use client";

import { useState, useEffect, useCallback } from "react";
import { LessonsTable, Lesson } from "@/components/lessons-table";
import { useRouter } from "next/navigation";

interface ClientLessonsTableProps {
  lessons: Lesson[];
  onOptimisticLessonAdded?: (callback: (lesson: Lesson) => void) => void;
}

export function ClientLessonsTable({ lessons: initialLessons, onOptimisticLessonAdded }: ClientLessonsTableProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [, setDeletingLessonId] = useState<string | null>(null);
  const router = useRouter();

  // Update local state when props change (e.g., after refresh)
  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  // Method to add a lesson optimistically
  const addOptimisticLesson = useCallback((lesson: Lesson) => {
    setLessons(prevLessons => {
      // Check if lesson already exists to prevent duplicates
      const exists = prevLessons.some(l => l.id === lesson.id);
      if (exists) {
        return prevLessons;
      }
      // Add to the beginning of the list
      return [lesson, ...prevLessons];
    });
  }, []);

  // Method to update lesson status
  const updateLessonStatus = useCallback((lessonId: string, status: Lesson["status"]) => {
    setLessons(prevLessons => 
      prevLessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, status } : lesson
      )
    );
  }, []);

  // Expose methods to parent component
  useEffect(() => {
    if (onOptimisticLessonAdded) {
      onOptimisticLessonAdded(addOptimisticLesson);
    }
  }, [onOptimisticLessonAdded, addOptimisticLesson]);

  const handleLessonDeleted = async (lessonId: string) => {
    setDeletingLessonId(lessonId);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/lessons/${lessonId}?t=${timestamp}`, {
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
      onLessonStatusUpdate={updateLessonStatus}
    />
  );
}
