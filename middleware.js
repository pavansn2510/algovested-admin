import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static files, favicon, and login routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname === "/api/auth"
  ) {
    return NextResponse.next();
  }

  // Check admin session cookie
  const token = request.cookies.get("algovested_admin_session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
