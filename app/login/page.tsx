"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        // Redirect to home page after successful login
        window.location.href = "/";
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "demo@lessonai.com",
        password: "demo123",
      });

      if (error) {
        setError("Demo user not available. Please set up the demo user in Supabase.");
      } else {
        // Redirect to home page after successful login
        window.location.href = "/";
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <nav className="w-full flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <Link href={"/"} className="text-2xl font-bold">
              Lesson AI
            </Link>
            <ThemeSwitcher />
          </div>
        </nav>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome to Lesson AI</CardTitle>
            <p className="text-center text-gray-600 text-sm">
              Sign in to start generating AI-powered lessons
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or try the demo
                  </span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={handleDemoLogin}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in as Demo User"}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h4 className="font-semibold text-blue-900 mb-2">Demo Credentials:</h4>
              <div className="text-sm text-blue-800">
                <div><strong>Email:</strong> demo@lessonai.com</div>
                <div><strong>Password:</strong> demo123</div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Note: The demo user needs to be created in your Supabase project first.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
