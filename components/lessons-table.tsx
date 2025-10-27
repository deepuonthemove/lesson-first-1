"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

export interface Lesson {
  id: string;
  title: string;
  status: "generating" | "generated" | "error";
  outline: string;
  content?: string;
  created_at: string;
}

interface LessonsTableProps {
  lessons: Lesson[];
  onLessonDeleted?: (lessonId: string) => void;
  onLessonStatusUpdate?: (lessonId: string, status: Lesson["status"]) => void;
}

export function LessonsTable({ lessons, onLessonDeleted, onLessonStatusUpdate }: LessonsTableProps) {
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDeleteLesson = async (lessonId: string) => {
    setDeletingLessonId(lessonId);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Call the callback to refresh the lessons list
      if (onLessonDeleted) {
        onLessonDeleted(lessonId);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson. Please try again.');
    } finally {
      setDeletingLessonId(null);
      setShowDeleteConfirm(null);
    }
  };

  const getStatusBadge = (status: Lesson["status"]) => {
    switch (status) {
      case "generating":
        return (
          <Badge variant="secondary" className="generating-badge">
            Generating<span className="generating-dots">...</span>
          </Badge>
        );
      case "generated":
        return <Badge variant="default">Generated</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (lessons.length === 0) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Your Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No lessons generated yet. Create your first lesson above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Your Lessons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{lesson.title}</div>
                     {/*<div className="text-sm text-gray-500 truncate max-w-xs">
                       {lesson.outline}
                    </div>*/}
                  </td>
                  <td className="p-3">
                    {getStatusBadge(lesson.status)}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {formatDate(lesson.created_at)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {lesson.status === "generating" && (
                        <Badge variant="secondary" className="animate-pulse">
                          Generating...
                        </Badge>
                      )}
                      {lesson.status === "generated" || lesson.status === "error" ? (
                        <>
                          {lesson.status === "generated" && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Link href={`/lessons/${lesson.id}`}>
                                View Lesson
                              </Link>
                            </Button>
                          )}
                          
                          {showDeleteConfirm === lesson.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteLesson(lesson.id)}
                                disabled={deletingLessonId === lesson.id}
                              >
                                {deletingLessonId === lesson.id ? "Deleting..." : "Confirm"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(null)}
                                disabled={deletingLessonId === lesson.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(lesson.id)}
                              disabled={deletingLessonId === lesson.id}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
