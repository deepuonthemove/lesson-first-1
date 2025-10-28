import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ClientLessonRenderer } from "@/components/client-lesson-renderer";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface LessonViewPageProps {
  params: {
    id: string;
  };
}

export default async function LessonViewPage({ params }: LessonViewPageProps) {
  // Await params in Next.js 15
  const { id } = await params;
  
  // Fetch lesson data server-side using service client
  const supabase = createServiceClient();
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !lesson) {
    notFound();
  }

  // For now, we'll hardcode admin status - you can implement proper auth later
  const isAdmin = false;

  return (
    <main className="min-h-screen flex flex-col items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={"/"}>
              <Badge className="lesson-ai-badge">Lesson AI</Badge>
            </Link>
          </div>
          <ThemeSwitcher />
        </div>
      </nav>
      
      <div className="flex-1 w-full max-w-4xl p-5">

        {lesson.status === "generating" && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Your lesson is being generated. Please wait...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {lesson.status === "error" && (
          <Card className="mb-6 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Generation Failed</h3>
                <p className="text-gray-600">There was an error generating your lesson. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {lesson.status === "generated" && (
          <>
            {/* Show banner if image generation failed */}
            {lesson.lesson_structure?.metadata?.imageGenerationFailed && (
              <Card className="mb-6 border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Unable to generate images
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          The AI was unable to generate images for this lesson. The text content has been generated successfully. 
                          Images may be unavailable due to API limitations or free-tier restrictions.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <ClientLessonRenderer 
              lessonId={id}
              isAdmin={isAdmin}
            />
          </>
        )}
      </div>
    </main>
  );
}
