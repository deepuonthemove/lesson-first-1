"use client";

import { useState, useEffect } from "react";
import { LessonGenerationForm } from "@/components/lesson-generation-form";
import { LessonsTable, Lesson } from "@/components/lessons-table";
import { SetupWarning } from "@/components/setup-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default function Home() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Fetch lessons on component mount
  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const response = await fetch("/api/lessons");
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
        setSetupError(null);
      } else {
        const errorData = await response.json();
        console.error("Error fetching lessons:", errorData.error);
        if (errorData.error?.includes("Supabase environment variables")) {
          setSetupError(errorData.error);
        }
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };

  const handleGenerateLesson = async (outline: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outline }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add the new lesson to the list
        setLessons(prev => [data.lesson, ...prev]);
        
        // Poll for updates every 2 seconds until generation is complete
        const pollForUpdates = async () => {
          try {
            const updateResponse = await fetch("/api/lessons");
            if (updateResponse.ok) {
              const updateData = await updateResponse.json();
              const updatedLessons = updateData.lessons || [];
              setLessons(updatedLessons);
              
              // Check if the lesson is still generating
              const currentLesson = updatedLessons.find((l: Lesson) => l.id === data.lesson.id);
              if (currentLesson && currentLesson.status === "generating") {
                setTimeout(pollForUpdates, 2000);
              } else {
                setIsGenerating(false);
              }
            }
          } catch (error) {
            console.error("Error polling for updates:", error);
            setIsGenerating(false);
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

  const handleLessonDeleted = (lessonId: string) => {
    // Remove the deleted lesson from the state
    setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
  };

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-8 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Lesson AI</Link>
            </div>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
            </div>
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col gap-8 max-w-5xl p-5 w-full">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">AI Lesson Generator</h1>
            <p className="text-gray-600 text-lg">
              Create comprehensive lessons from simple outlines
            </p>
          </div>
          
          <div className="flex flex-col gap-8 items-center">
            {setupError && <SetupWarning />}
            
            <LessonGenerationForm 
              onGenerate={handleGenerateLesson}
              isGenerating={isGenerating}
            />
            
            <LessonsTable lessons={lessons} onLessonDeleted={handleLessonDeleted} />
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
