import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, adminFromToken, setSessionCookies, clearSessionCookies } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuwmtepfsdsoatsygfoj.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Sign in: password check with Supabase, then a strict admin check.
export async function POST(request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: String(email).trim(), password });
  if (error || !data?.session) return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });

  const admin = await adminFromToken(data.session.access_token);
  if (!admin) {
    await client.auth.signOut().catch(() => {});
    return NextResponse.json({ error: "This account does not have admin access." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, user: { ...admin, role: "admin" } });
  setSessionCookies(response, data.session);
  return response;
}

// Current session (the middleware has already verified it).
export async function GET(request) {
  const admin = await adminFromToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user: { ...admin, role: "admin" } });
}

// Sign out.
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
