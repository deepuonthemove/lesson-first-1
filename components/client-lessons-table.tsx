"use client";

import { useState, useEffect, useCallback } from "react";
import { LessonsTable, Lesson } from "@/components/lessons-table";
// Removed useRouter - no page refreshes needed

interface ClientLessonsTableProps {
  lessons: Lesson[];
  onOptimisticLessonAdded?: (callback: (lesson: Lesson) => void) => void;
  onLessonsUpdateRequested?: (callback: (lessons: Lesson[]) => void) => void;
}

export function ClientLessonsTable({ lessons: initialLessons, onOptimisticLessonAdded, onLessonsUpdateRequested }: ClientLessonsTableProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [, setDeletingLessonId] = useState<string | null>(null);
  // Removed router - no page refreshes needed

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

  // Method to update all lessons with fresh data from API
  const updateAllLessons = useCallback((newLessons: Lesson[]) => {
    setLessons(newLessons);
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

  // Expose updateAllLessons method to parent component
  useEffect(() => {
    if (onLessonsUpdateRequested) {
      onLessonsUpdateRequested(updateAllLessons);
    }
  }, [onLessonsUpdateRequested, updateAllLessons]);

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
      
      // No page refresh needed - we've already updated the UI optimistically
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson. Please try again.');
      // Don't revert to initialLessons - keep current state
      // setLessons(initialLessons); // REMOVED - no revert needed
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
