"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Lesson } from "@/components/lessons-table";

// TypeScript compiler will be loaded dynamically
declare global {
  interface Window {
    ts: any;
  }
}

export default function LessonViewPage() {
  const params = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (params.id) {
      fetchLesson(params.id as string);
    }
  }, [params.id]);

  const generateTypeScriptAtViewTime = () => {
    if (!window.ts) return;

    const timestamp = Date.now();
    const componentName = `LessonViewGeneratedComponent${timestamp}`;
    
    // Generate TypeScript code that represents the lesson view functionality
    const tsCode = `
import React, { useState, useEffect } from 'react';

interface LessonViewData {
  id: string;
  title: string;
  content: string;
  status: 'generating' | 'generated' | 'error';
  created_at: string;
}

interface GeneratedLessonViewProps {
  lesson: LessonViewData;
  onLessonUpdate: (lesson: LessonViewData) => void;
}

const ${componentName}: React.FC<GeneratedLessonViewProps> = ({ 
  lesson, 
  onLessonUpdate 
}) => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [lastViewed, setLastViewed] = useState<string>(new Date().toISOString());

  useEffect(() => {
    // This TypeScript code was generated at view time: ${new Date().toISOString()}
    console.log('TypeScript lesson view component generated at view time:', componentName);
    setViewCount(prev => prev + 1);
  }, []);

  const handleLessonInteraction = (): void => {
    setViewCount(prev => prev + 1);
    setLastViewed(new Date().toISOString());
    
    // Simulate lesson interaction with TypeScript
    const updatedLesson: LessonViewData = {
      ...lesson,
      content: \`\${lesson.content}\\n\\n[TypeScript Generated Interaction at \${new Date().toLocaleString()}]\`
    };
    
    onLessonUpdate(updatedLesson);
  };

  return (
    <div style={{ 
      padding: '16px', 
      border: '2px solid #28a745', 
      borderRadius: '8px',
      backgroundColor: '#f0fff4',
      margin: '16px 0'
    }}>
      <h3 style={{ color: '#28a745', marginBottom: '8px' }}>
        TypeScript Generated Lesson View Component
      </h3>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
        Generated at: {new Date().toLocaleString()}
      </p>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
        This component was created from TypeScript code that didn't exist before this lesson page was viewed.
      </p>
      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>View Count: {viewCount}</p>
        <p>Last Viewed: {lastViewed}</p>
        <p>Lesson ID: {lesson.id}</p>
      </div>
      <button 
        onClick={handleLessonInteraction}
        style={{
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '8px'
        }}
      >
        Interact with Lesson (TypeScript Generated)
      </button>
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

      console.log('TypeScript lesson view generated at view time:', tsCode);
      console.log('Compiled JavaScript for lesson view:', jsCode);
      
      setTsGenerated(true);
      
      // Store the generated TypeScript in localStorage for demonstration
      localStorage.setItem('generatedLessonViewTypeScript', tsCode);
      localStorage.setItem('compiledLessonViewJavaScript', jsCode);
      
    } catch (error) {
      console.error('TypeScript lesson view generation error:', error);
    }
  };

  const fetchLesson = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson);
      } else if (response.status === 404) {
        setError("Lesson not found");
      } else {
        setError("Failed to load lesson");
      }
    } catch (error) {
      console.error("Error fetching lesson:", error);
      setError("Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

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

  const renderMarkdownContent = (content: string) => {
    // Simple markdown rendering - in a real app you'd use a proper markdown library
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key++} className="text-3xl font-bold mt-8 mb-4 text-gray-900">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-2xl font-semibold mt-6 mb-3 text-gray-800">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-xl font-medium mt-4 mb-2 text-gray-700">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={key++} className="ml-4 mb-1 text-gray-700">
            {line.substring(2)}
          </li>
        );
      } else if (line.startsWith('1. ')) {
        elements.push(
          <li key={key++} className="ml-4 mb-1 text-gray-700">
            {line.substring(3)}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<br key={key++} />);
      } else if (line.trim()) {
        elements.push(
          <p key={key++} className="mb-3 text-gray-700 leading-relaxed">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center">
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
            <ThemeSwitcher />
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lesson...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !lesson) {
    return (
      <main className="min-h-screen flex flex-col items-center">
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
            <ThemeSwitcher />
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
                <p className="text-gray-600 mb-4">{error || "Lesson not found"}</p>
                <Link href="/">
                  <Button>Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

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

        {lesson.status === "generated" && lesson.content && (
          <Card>
            <CardHeader>
              <CardTitle>Lesson Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {renderMarkdownContent(lesson.content)}
              </div>
            </CardContent>
          </Card>
        )}

        {lesson.status === "generated" && !lesson.content && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600">No content available for this lesson.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
