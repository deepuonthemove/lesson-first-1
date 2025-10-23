import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Create a transaction for distributed tracing
    return Sentry.startSpan({ 
      name: "GET /api/test-trace", 
      op: "http.server" 
    }, async () => {
      console.log("Test trace endpoint called");
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test capturing a message to verify Sentry is working
      Sentry.captureMessage("Test message from trace endpoint", "info");
      
      // Test capturing an exception
      try {
        throw new Error("Test exception for Sentry");
      } catch (error) {
        Sentry.captureException(error);
      }
      
      // Test custom tags and context
      Sentry.setTag("test", "true");
      Sentry.setContext("test_context", {
        endpoint: "/api/test-trace",
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        message: "Trace test successful",
        timestamp: new Date().toISOString(),
        sentryWorking: "Check your Sentry Issues and Performance tabs for test data"
      });
    });
  } catch (error) {
    console.error("Error in test-trace endpoint:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
