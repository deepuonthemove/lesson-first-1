"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <CardContent className="p-0">
        <div className="gradient-form-container">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prominent Textarea */}
            <div>
              <textarea
                id="outline"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="What would you like to learn about? (e.g., 'A one-pager on how to divide with long division')"
                className="prominent-textarea w-full"
                disabled={isGenerating}
              />
            </div>

            {/* Options - Always Visible, Compact */}
            <div className="space-y-4">
              {/* Row 1: Grade & Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Grade Level</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 3, 4, 5, 6, 7, 8].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setGradeLevel(level.toString() as '2' | '3' | '4' | '5' | '6' | '7' | '8')}
                        className={`pill-selector ${gradeLevel === level.toString() ? 'pill-selector-active' : ''}`}
                        disabled={isGenerating}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sections</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[4, 5, 6, 7, 8].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSections(num)}
                        className={`pill-selector ${sections === num ? 'pill-selector-active' : ''}`}
                        disabled={isGenerating}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Learning Style */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Learning Style</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLearningStyle('reading')}
                    className={`style-pill ${learningStyle === 'reading' ? 'style-pill-active' : ''}`}
                    disabled={isGenerating}
                  >
                    Reading
                  </button>
                  <button
                    type="button"
                    onClick={() => setLearningStyle('reading and visual')}
                    className={`style-pill ${learningStyle === 'reading and visual' ? 'style-pill-active' : ''}`}
                    disabled={isGenerating}
                  >
                    Reading & Visual
                  </button>
                </div>
                {learningStyle === 'reading and visual' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Images will be AI-generated
                  </p>
                )}
              </div>

              {/* Row 3: Checkboxes - Inline */}
              <div className="flex gap-6 flex-wrap">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeExamples"
                    checked={includeExamples}
                    onCheckedChange={(checked) => setIncludeExamples(checked as boolean)}
                    disabled={isGenerating}
                  />
                  <Label htmlFor="includeExamples" className="text-xs">
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
                  <Label htmlFor="includeExercises" className="text-xs">
                    Include exercises and practice problems
                  </Label>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              type="submit" 
              disabled={!outline.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? "Generating with AI..." : "Generate Lesson with AI"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
