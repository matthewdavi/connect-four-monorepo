import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Store the response so we can modify its headers
  const response = NextResponse.next();

  // Get search params
  const searchParams = request.nextUrl.searchParams.toString();

  // Set custom headers
  response.headers.set("x-modified-edge", "true");

  // Add cache control headers with SWR, including search params in cache key
  response.headers.set(
    "Cache-Control",
    `public, must-revalidate, immutable, s-maxage=600, stale-while-revalidate=600, max-age=600, vary=search`,
  );

  // Add explicit cache key based on search params
  if (searchParams) {
    response.headers.set("x-cache-key", searchParams);
    response.headers.set("vary", "search");
  }

  return response;
}

// Optionally match only specific paths
export const config = {
  matcher: [
    "/:path*", // Matches everything
  ],
};
