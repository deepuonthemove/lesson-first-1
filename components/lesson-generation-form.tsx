"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { logError, logUserAction } from "@/lib/sentry";

interface LessonGenerationFormProps {
  onGenerate: (options: LessonGenerationOptions) => void;
  isGenerating: boolean;
}

interface LessonGenerationOptions {
  outline: string;
  gradeLevel: '2' | '3' | '4' | '5' | '6' | '7' | '8';
  sections: number;
  learningStyle: 'reading and visual' | 'reading';
  includeExamples: boolean;
  includeExercises: boolean;
}

export function LessonGenerationForm({ onGenerate, isGenerating }: LessonGenerationFormProps) {
  const [outline, setOutline] = useState("");
  const [gradeLevel, setGradeLevel] = useState<'2' | '3' | '4' | '5' | '6' | '7' | '8'>('2');
  const [sections, setSections] = useState(4);
  const [learningStyle, setLearningStyle] = useState<'reading and visual' | 'reading'>('reading');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeExercises, setIncludeExercises] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (outline.trim()) {
        logUserAction("lesson_generation_started", {
          outline: outline.trim().substring(0, 100),
          gradeLevel,
          sections,
          learningStyle,
          includeExamples,
          includeExercises
        });
        
        onGenerate({
          outline: outline.trim(),
          gradeLevel,
          sections,
          learningStyle,
          includeExamples,
          includeExercises
        });
        setOutline("");
      }
    } catch (error) {
      logError(error as Error, {
        component: "LessonGenerationForm",
        action: "handleSubmit",
        outline: outline.trim().substring(0, 100)
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Generate New Lesson with AI</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="outline">Lesson Outline</Label>
            <textarea
              id="outline"
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder="Enter your lesson outline here... (e.g., 'Introduction to React Hooks', 'Machine Learning Fundamentals', etc.)"
              className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <select
                id="gradeLevel"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value as '2' | '3' | '4' | '5' | '6' | '7' | '8')}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sections">Sections</Label>
              <input
                id="sections"
                type="number"
                min="2"
                max="10"
                value={sections}
                onChange={(e) => setSections(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="learningStyle">Learning Style</Label>
            <select
              id="learningStyle"
              value={learningStyle}
              onChange={(e) => setLearningStyle(e.target.value as 'reading and visual' | 'reading')}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="reading and visual">Reading and Visual (diagrams, charts, images)</option>
              <option value="reading">Reading (text-based content)</option>
            </select>
            {learningStyle === 'reading and visual' && (
              <p className="text-sm text-gray-500 mt-2">
                Images will be AI-generated based on Visual Aid hints in the content
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Content Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeExamples"
                  checked={includeExamples}
                  onCheckedChange={(checked) => setIncludeExamples(checked as boolean)}
                  disabled={isGenerating}
                />
                <Label htmlFor="includeExamples" className="text-sm">
                  Include practical examples
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeExercises"
                  checked={includeExercises}
                  onCheckedChange={(checked) => setIncludeExercises(checked as boolean)}
                  disabled={isGenerating}
                />
                <Label htmlFor="includeExercises" className="text-sm">
                  Include exercises and practice problems
                </Label>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!outline.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? "Generating with AI..." : "Generate Lesson with AI"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
