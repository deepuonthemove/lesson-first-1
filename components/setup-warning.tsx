"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SetupWarning() {
  return (
    <Card className="w-full max-w-4xl border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Setup Required
          </Badge>
          Supabase Configuration Missing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-700">
            To use this application, you need to configure your Supabase environment variables.
          </p>
          
          <div className="bg-white p-4 rounded-md border">
            <h4 className="font-semibold mb-2">Quick Setup:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root</li>
              <li>Add your Supabase credentials:</li>
            </ol>
            <div className="mt-3 p-3 bg-gray-100 rounded text-sm font-mono">
              <div>NEXT_PUBLIC_SUPABASE_URL=your_supabase_url</div>
              <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key</div>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 mt-3" start={3}>
              <li>Run the SQL schema in your Supabase project (see SETUP.md)</li>
              <li>Restart your development server</li>
            </ol>
          </div>
          
          <p className="text-sm text-gray-600">
            📖 See <code className="bg-gray-100 px-1 rounded">SETUP.md</code> for detailed instructions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
