import { NextResponse } from "next/server";
import { SESSION_COOKIE, REFRESH_COOKIE, adminFromToken, refreshSession, setSessionCookies, clearSessionCookies } from "@/lib/admin-auth";

// Every page and API route requires a verified admin session. The token is checked with
// Supabase on each request; an expired token is refreshed once, otherwise access is denied.
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/auth") return NextResponse.next();

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = request.cookies.get(SESSION_COOKIE)?.value || bearer;

  let admin = token ? await adminFromToken(token) : null;
  let refreshed = null;
  if (!admin && !bearer) {
    refreshed = await refreshSession(request.cookies.get(REFRESH_COOKIE)?.value);
    if (refreshed?.access_token) admin = await adminFromToken(refreshed.access_token);
  }

  if (!admin) {
    const denied = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized: admin session required" }, { status: 401 })
      : NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    clearSessionCookies(denied);
    return denied;
  }

  const res = NextResponse.next();
  if (refreshed) setSessionCookies(res, refreshed);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
