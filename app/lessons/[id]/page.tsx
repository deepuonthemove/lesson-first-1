import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Lesson } from "@/components/lessons-table";
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

  const getStatusBadge = (status: Lesson["status"]) => {
    switch (status) {
      case "generating":
        return <Badge variant="secondary">Generating</Badge>;
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={"/"}>Lesson AI</Link>
          </div>
          <ThemeSwitcher />
        </div>
      </nav>
      
      <div className="flex-1 w-full max-w-4xl p-5">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              ← Back to Lessons
            </Button>
          </Link>
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
            {getStatusBadge(lesson.status)}
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            Created on {formatDate(lesson.created_at)}
          </div>
        </div>

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
          <ClientLessonRenderer 
            lessonId={id}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </main>
  );
}
