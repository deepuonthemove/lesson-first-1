import { NextRequest, NextResponse } from "next/server";
import { LessonTracer } from "@/lib/tracing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trace = await LessonTracer.getTraceById(id);
    
    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }
    
    return NextResponse.json({ trace });
  } catch (error) {
    console.error("Error fetching trace:", error);
    return NextResponse.json({ error: "Failed to fetch trace" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await LessonTracer.deleteTrace(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete trace" }, { status: 500 });
    }
    
    return NextResponse.json({ message: "Trace deleted successfully" });
  } catch (error) {
    console.error("Error deleting trace:", error);
    return NextResponse.json({ error: "Failed to delete trace" }, { status: 500 });
  }
}
