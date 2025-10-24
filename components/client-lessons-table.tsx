"use client";

import { useState } from "react";
import { LessonsTable, Lesson } from "@/components/lessons-table";
import { useRouter } from "next/navigation";

interface ClientLessonsTableProps {
  lessons: Lesson[];
}

export function ClientLessonsTable({ lessons }: ClientLessonsTableProps) {
  const [, setDeletingLessonId] = useState<string | null>(null);
  const router = useRouter();

  const handleLessonDeleted = async (lessonId: string) => {
    setDeletingLessonId(lessonId);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Refresh the page to update the lessons list
      router.refresh();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson. Please try again.');
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
