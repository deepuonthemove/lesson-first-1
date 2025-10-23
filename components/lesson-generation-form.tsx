"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface LessonGenerationFormProps {
  onGenerate: (outline: string) => void;
  isGenerating: boolean;
}

export function LessonGenerationForm({ onGenerate, isGenerating }: LessonGenerationFormProps) {
  const [outline, setOutline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (outline.trim()) {
      onGenerate(outline.trim());
      setOutline("");
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Generate New Lesson</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outline">Lesson Outline</Label>
            <textarea
              id="outline"
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder="Enter your lesson outline here..."
              className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!outline.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? "Generating..." : "Generate Lesson"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
