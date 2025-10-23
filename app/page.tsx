"use client";

import { useState, useEffect } from "react";
import { LessonGenerationForm } from "@/components/lesson-generation-form";
import { LessonsTable, Lesson } from "@/components/lessons-table";
import { SetupWarning } from "@/components/setup-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

// TypeScript compiler will be loaded dynamically
declare global {
  interface Window {
    ts: any;
  }
}

export default function Home() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [tsGenerated, setTsGenerated] = useState(false);

  // Load TypeScript compiler and generate TypeScript at view time
  useEffect(() => {
    const loadTypeScriptAndGenerate = async () => {
      try {
        // Load TypeScript compiler from CDN
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/typescript@latest/lib/typescript.js';
        script.onload = () => {
          // Generate TypeScript code automatically when page loads
          generateTypeScriptAtViewTime();
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load TypeScript compiler:', error);
      }
    };

    loadTypeScriptAndGenerate();
  }, []);

  // Fetch lessons on component mount
  useEffect(() => {
    fetchLessons();
  }, []);

  const generateTypeScriptAtViewTime = () => {
    if (!window.ts) return;

    const timestamp = Date.now();
    const componentName = `LessonAIGeneratedComponent${timestamp}`;
    
    // Generate TypeScript code that represents the current lesson generation functionality
    const tsCode = `
import React, { useState, useEffect } from 'react';

interface LessonData {
  id: string;
  title: string;
  content: string;
  status: 'generating' | 'completed';
  created_at: string;
}

interface GeneratedLessonComponentProps {
  onLessonGenerated: (lesson: LessonData) => void;
  isGenerating: boolean;
}

const ${componentName}: React.FC<GeneratedLessonComponentProps> = ({ 
  onLessonGenerated, 
  isGenerating 
}) => {
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generationCount, setGenerationCount] = useState<number>(0);

  useEffect(() => {
    // This TypeScript code was generated at view time: ${new Date().toISOString()}
    console.log('TypeScript component generated at view time:', componentName);
  }, []);

  const handleGenerateLesson = async (outline: string): Promise<void> => {
    setGenerationCount(prev => prev + 1);
    
    // Simulate lesson generation with TypeScript
    const lesson: LessonData = {
      id: \`generated-\${Date.now()}\`,
      title: \`Generated Lesson \${generationCount + 1}\`,
      content: \`This lesson was generated using TypeScript at view time. Original outline: "\${outline}"\`,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    setGeneratedContent(lesson.content);
    onLessonGenerated(lesson);
  };

  return (
    <div style={{ 
      padding: '16px', 
      border: '2px solid #007acc', 
      borderRadius: '8px',
      backgroundColor: '#f0f8ff',
      margin: '16px 0'
    }}>
      <h3 style={{ color: '#007acc', marginBottom: '8px' }}>
        TypeScript Generated Component
      </h3>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
        Generated at: {new Date().toLocaleString()}
      </p>
      <p style={{ fontSize: '12px', color: '#888' }}>
        This component was created from TypeScript code that didn't exist before this page was viewed.
      </p>
      {generatedContent && (
        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e6f3ff', borderRadius: '4px' }}>
          <strong>Generated Content:</strong> {generatedContent}
        </div>
      )}
    </div>
  );
};

export default ${componentName};
`;

    try {
      // Compile TypeScript to JavaScript
      const jsCode = window.ts.transpile(tsCode, {
        target: window.ts.ScriptTarget.ES2020,
        module: window.ts.ModuleKind.ESNext,
        jsx: window.ts.JsxEmit.React,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true
      });

      console.log('TypeScript generated at view time:', tsCode);
      console.log('Compiled JavaScript:', jsCode);
      
      setTsGenerated(true);
      
      // Store the generated TypeScript in localStorage for demonstration
      localStorage.setItem('generatedTypeScript', tsCode);
      localStorage.setItem('compiledJavaScript', jsCode);
      
    } catch (error) {
      console.error('TypeScript generation error:', error);
    }
  };

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

  const handleGenerateLesson = async (options: {
    outline: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    duration: number;
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    includeExamples: boolean;
    includeExercises: boolean;
  }) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
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
              {tsGenerated && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  ✓ TypeScript Generated
                </span>
              )}
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
