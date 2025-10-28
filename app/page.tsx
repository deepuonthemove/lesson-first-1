import { LessonCoordinator } from "@/components/lesson-coordinator";
import { SetupWarning } from "@/components/setup-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function Home() {
  // Fetch lessons server-side using service client
  const supabase = createServiceClient();
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false });

  
  const setupError = error?.message?.includes("Supabase environment variables") ? error.message : null;

  return (
    <main className="main-page-gradient-wrapper min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-8 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>
                <Badge className="lesson-ai-badge">Lesson AI</Badge>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
            </div>
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col gap-12 max-w-5xl p-8 w-full">
          <div className="text-center mt-8">
            <h1 className="halo-title text-3xl font-medium mb-6">AI Lesson Generator</h1>
            <p className="text-muted-foreground text-lg">
              Create comprehensive lessons from simple outlines
            </p>
          </div>
          
          <div className="flex flex-col gap-12 items-center">
            {setupError && <SetupWarning />}
            
            <LessonCoordinator lessons={lessons || []} />
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
