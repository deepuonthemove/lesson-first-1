import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // No user authentication middleware needed
  // Service authentication is handled in API routes using createServiceClient()
  return NextResponse.next({
    request,
  });
}
