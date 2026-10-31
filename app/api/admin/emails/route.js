import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 50);

    const supabase = getAdminSupabase();

    const { data: logs, error } = await supabase
      .from("email_notifications_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: (logs || []).length,
      logs: logs || [],
    });
  } catch (err) {
    console.error("GET /api/admin/emails error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
