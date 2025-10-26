import { NextRequest, NextResponse } from "next/server";
import { ImageTracer } from "@/lib/image-tracing";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const traces = await ImageTracer.getTraces(limit, offset);
    
    return NextResponse.json({ traces });
  } catch (error) {
    console.error("Error fetching image traces:", error);
    return NextResponse.json({ error: "Failed to fetch image traces" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      const success = await ImageTracer.deleteAllTraces();
      if (!success) {
        return NextResponse.json({ error: "Failed to delete all image traces" }, { status: 500 });
      }
      return NextResponse.json({ message: "All image traces deleted successfully" });
    }

    if (!traceId) {
      return NextResponse.json({ error: "Trace ID is required" }, { status: 400 });
    }

    const success = await ImageTracer.deleteTrace(traceId);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete image trace" }, { status: 500 });
    }

    return NextResponse.json({ message: "Image trace deleted successfully" });
  } catch (error) {
    console.error("Error deleting image trace:", error);
    return NextResponse.json({ error: "Failed to delete image trace" }, { status: 500 });
  }
}

