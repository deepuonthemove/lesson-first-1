import { NextRequest, NextResponse } from "next/server";
import { LessonTracer } from "@/lib/tracing";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const traces = await LessonTracer.getTraces(limit, offset);
    
    return NextResponse.json({ traces });
  } catch (error) {
    console.error("Error fetching traces:", error);
    return NextResponse.json({ error: "Failed to fetch traces" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      const success = await LessonTracer.deleteAllTraces();
      if (!success) {
        return NextResponse.json({ error: "Failed to delete all traces" }, { status: 500 });
      }
      return NextResponse.json({ message: "All traces deleted successfully" });
    }

    if (!traceId) {
      return NextResponse.json({ error: "Trace ID is required" }, { status: 400 });
    }

    const success = await LessonTracer.deleteTrace(traceId);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete trace" }, { status: 500 });
    }

    return NextResponse.json({ message: "Trace deleted successfully" });
  } catch (error) {
    console.error("Error deleting trace:", error);
    return NextResponse.json({ error: "Failed to delete trace" }, { status: 500 });
  }
}
