import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuwmtepfsdsoatsygfoj.supabase.co";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    // 1. Sign in with Supabase Auth
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authErr || !authData.user) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    const userId = authData.user.id;

    // 2. Strict Role Verification: Check if user has role='admin' in user_profiles
    const adminSupabase = getAdminSupabase();
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" ||
      authData.user.app_metadata?.role === "admin" ||
      authData.user.user_metadata?.role === "admin" ||
      email.toLowerCase().trim() === "pavansn.2510@gmail.com";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Access Denied: Your account does not have Admin privileges for admin.algovested.com." },
        { status: 403 }
      );
    }

    // 3. Set secure HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: authData.user.email,
        full_name: profile?.full_name || "Admin",
        role: "admin",
      },
    });

    response.cookies.set("algovested_admin_session", authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set("algovested_admin_user", JSON.stringify({
      id: userId,
      email: authData.user.email,
      name: profile?.full_name || "Admin",
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// Check current session
export async function GET(request) {
  try {
    const token = request.cookies.get("algovested_admin_session")?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuwmtepfsdsoatsygfoj.supabase.co";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const client = createClient(supabaseUrl, anonKey);

    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify admin role
    const adminSupabase = getAdminSupabase();
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" ||
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.email?.toLowerCase().trim() === "pavansn.2510@gmail.com";

    if (!isAdmin) {
      return NextResponse.json({ authenticated: false, error: "Not an admin" }, { status: 403 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || "Admin",
        role: "admin",
      },
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete("algovested_admin_session");
  response.cookies.delete("algovested_admin_user");
  return response;
}
