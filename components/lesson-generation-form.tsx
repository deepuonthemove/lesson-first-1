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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  includeExamples: boolean;
  includeExercises: boolean;
}

export function LessonGenerationForm({ onGenerate, isGenerating }: LessonGenerationFormProps) {
  const [outline, setOutline] = useState("");
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [duration, setDuration] = useState(30);
  const [learningStyle, setLearningStyle] = useState<'visual' | 'auditory' | 'kinesthetic' | 'reading'>('reading');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeExercises, setIncludeExercises] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (outline.trim()) {
        logUserAction("lesson_generation_started", {
          outline: outline.trim().substring(0, 100),
          difficulty,
          duration,
          learningStyle,
          includeExamples,
          includeExercises
        });
        
        onGenerate({
          outline: outline.trim(),
          difficulty,
          duration,
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
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <input
                id="duration"
                type="number"
                min="10"
                max="120"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
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
              onChange={(e) => setLearningStyle(e.target.value as 'visual' | 'auditory' | 'kinesthetic' | 'reading')}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="visual">Visual (diagrams, charts, images)</option>
              <option value="auditory">Auditory (explanations, discussions)</option>
              <option value="kinesthetic">Kinesthetic (hands-on activities)</option>
              <option value="reading">Reading (text-based content)</option>
            </select>
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
