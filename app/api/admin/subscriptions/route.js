import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // 'needs_ip' | 'all'

    const supabase = getAdminSupabase();

    // 1. Fetch all subscriptions
    const { data: subs, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (subErr) throw subErr;

    // 2. Fetch profiles to see dedicated_ip and outbound_proxy_url
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, dedicated_ip, outbound_proxy_url");

    let combined = (subs || []).map((s) => {
      const p = (profiles || []).find((prof) => prof.id === s.user_id);
      const isIpConfigured = Boolean(p?.outbound_proxy_url);

      return {
        ...s,
        full_name: p?.full_name || "Trader",
        dedicated_ip: p?.dedicated_ip || null,
        outbound_proxy_url: p?.outbound_proxy_url || null,
        is_ip_configured: isIpConfigured,
      };
    });

    // Priority filter: Show paid users who DO NOT have an IP address configured first
    if (filter === "needs_ip") {
      combined = combined.filter((s) => s.status === "active" && !s.is_ip_configured);
    } else {
      // Sort so users without an IP appear at the very top
      combined.sort((a, b) => {
        if (!a.is_ip_configured && b.is_ip_configured) return -1;
        if (a.is_ip_configured && !b.is_ip_configured) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const pendingIpCount = combined.filter((s) => s.status === "active" && !s.is_ip_configured).length;

    return NextResponse.json({
      success: true,
      total: combined.length,
      pending_ip_count: pendingIpCount,
      subscriptions: combined,
    });
  } catch (err) {
    console.error("GET /api/admin/subscriptions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
