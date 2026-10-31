import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getAdminSupabase();

    const { data: notifications, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      unread_count: unreadCount,
      notifications: notifications || [],
    });
  } catch (err) {
    console.error("GET /api/admin/notifications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Mark notifications as read
export async function POST(request) {
  try {
    const { id, mark_all } = await request.json();
    const supabase = getAdminSupabase();

    if (mark_all) {
      await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
    } else if (id) {
      await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
