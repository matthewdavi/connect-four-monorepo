import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Store the response so we can modify its headers
  const response = NextResponse.next();

  // Set custom headers
  response.headers.set("x-modified-edge", "true");

  // Add cache control headers with SWR
  // stale-while-revalidate allows serving stale content while fetching fresh content
  response.headers.set(
    "Cache-Control",
    "public, must-revalidate, immutable, s-maxage=600, stale-while-revalidate=600, max-age=600",
  );

  // Add cache key based on search params
  const searchParams = request.nextUrl.searchParams.toString();
  if (searchParams) {
    response.headers.set("x-cache-key", searchParams);
  }

  return response;
}

// Optionally match only specific paths
export const config = {
  matcher: [
    // Add your paths here
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
