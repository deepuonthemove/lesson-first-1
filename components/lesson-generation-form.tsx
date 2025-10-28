"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp } from "lucide-react";
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
            {/* Unified Input Container */}
            <div className="unified-input-container">
              {/* Integrated Textarea - Larger */}
              <textarea
                id="outline"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="What would you like to learn about? (e.g., 'A one-pager on how to divide with long division')"
                className="integrated-textarea"
                disabled={isGenerating}
              />
              
              {/* Options Footer Bar - No separator, inline flow */}
              <div className="options-footer-bar">
                {/* Grade Level Dropdown */}
                <div className="flex items-center gap-1">
                  <label htmlFor="grade" className="inline-label">Grade:</label>
                  <select
                    id="grade"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value as any)}
                    className="inline-select"
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

                {/* Sections Dropdown */}
                <div className="flex items-center gap-1">
                  <label htmlFor="sections" className="inline-label">Sections:</label>
                  <select
                    id="sections"
                    value={sections}
                    onChange={(e) => setSections(Number(e.target.value))}
                    className="inline-select"
                    disabled={isGenerating}
                  >
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </div>

                {/* Learning Style Dropdown */}
                <div className="flex items-center gap-1">
                  <label htmlFor="style" className="inline-label">Style:</label>
                  <select
                    id="style"
                    value={learningStyle}
                    onChange={(e) => setLearningStyle(e.target.value as any)}
                    className="inline-select"
                    disabled={isGenerating}
                  >
                    <option value="reading">Reading</option>
                    <option value="reading and visual">Reading & Visual</option>
                  </select>
                </div>

                {/* Toggle Text Labels - Inline (NOT right-aligned) */}
                <div className="toggle-text-group">
                  <span
                    className={`toggle-text-item ${includeExamples ? 'active' : ''}`}
                    onClick={() => !isGenerating && setIncludeExamples(!includeExamples)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isGenerating) {
                        e.preventDefault();
                        setIncludeExamples(!includeExamples);
                      }
                    }}
                    aria-label={`${includeExamples ? 'Disable' : 'Enable'} examples`}
                  >
                    Examples
                  </span>
                  <span
                    className={`toggle-text-item ${includeExercises ? 'active' : ''}`}
                    onClick={() => !isGenerating && setIncludeExercises(!includeExercises)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isGenerating) {
                        e.preventDefault();
                        setIncludeExercises(!includeExercises);
                      }
                    }}
                    aria-label={`${includeExercises ? 'Disable' : 'Enable'} exercises`}
                  >
                    Exercises
                  </span>
                </div>

                {/* Submit Arrow Button - Right corner */}
                <button
                  type="submit"
                  disabled={!outline.trim() || isGenerating}
                  className="submit-arrow-button"
                  aria-label="Generate lesson"
                >
                  <ArrowUp className="submit-arrow-icon" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
