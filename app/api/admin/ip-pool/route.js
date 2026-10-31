import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getAdminSupabase();

    const { data: proxies, error } = await supabase
      .from("outbound_proxy_pool")
      .select("id, proxy_url, dedicated_ip, assigned_user_id, is_admin_reserved, is_active, dhan_ip_synced, dhan_ip_status, last_synced_at, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: (proxies || []).length,
      proxies: proxies || [],
    });
  } catch (err) {
    console.error("GET /api/admin/ip-pool error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Add a new proxy IP to the pool
export async function POST(request) {
  try {
    const body = await request.json();
    const { proxy_url, dedicated_ip, is_admin_reserved } = body;

    if (!proxy_url || !dedicated_ip) {
      return NextResponse.json({ error: "proxy_url and dedicated_ip are required" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("outbound_proxy_pool")
      .insert({
        proxy_url: proxy_url.trim(),
        dedicated_ip: dedicated_ip.trim(),
        is_admin_reserved: is_admin_reserved === true,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Proxy added to pool successfully",
      proxy: data,
    });
  } catch (err) {
    console.error("POST /api/admin/ip-pool error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
