import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    const supabase = getAdminSupabase();

    // 1. Fetch auth users
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) throw authErr;

    const authUsers = authData?.users || [];

    // 2. Fetch profiles
    const { data: profiles, error: profErr } = await supabase
      .from("user_profiles")
      .select("id, full_name, role, dedicated_ip, outbound_proxy_url, created_at, updated_at");

    // 3. Fetch broker accounts
    const { data: brokers, error: brokerErr } = await supabase
      .from("user_broker_accounts")
      .select("id, user_id, broker, client_id, mode, is_active, dedicated_ip, outbound_proxy_url, updated_at");

    // Combine user records
    let userList = authUsers.map((u) => {
      const p = (profiles || []).find((prof) => prof.id === u.id);
      const b = (brokers || []).find((brk) => brk.user_id === u.id);

      const assignedProxy = p?.outbound_proxy_url || b?.outbound_proxy_url || null;
      const assignedIp = p?.dedicated_ip || b?.dedicated_ip || null;

      return {
        id: u.id,
        email: u.email,
        full_name: p?.full_name || u.user_metadata?.full_name || "Anonymous",
        role: p?.role || "user",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        is_ip_configured: Boolean(assignedProxy),
        dedicated_ip: assignedIp,
        outbound_proxy_url: assignedProxy,
        broker_account: b
          ? {
              broker: b.broker,
              client_id: b.client_id,
              mode: b.mode,
              is_active: b.is_active,
            }
          : null,
      };
    });

    if (query) {
      userList = userList.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.full_name.toLowerCase().includes(query) ||
          (u.dedicated_ip && u.dedicated_ip.toLowerCase().includes(query)) ||
          (u.broker_account?.client_id && u.broker_account.client_id.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({
      success: true,
      total: userList.length,
      users: userList,
    });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Assign or Update IP address / Proxy URL for a user
export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, email, dedicated_ip, outbound_proxy_url } = body;

    if (!user_id && !email) {
      return NextResponse.json({ error: "user_id or email is required" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    let targetUserId = user_id;
    if (!targetUserId && email) {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const found = authData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
      if (!found) {
        return NextResponse.json({ error: `User with email ${email} not found` }, { status: 404 });
      }
      targetUserId = found.id;
    }

    const cleanIp = (dedicated_ip || "").trim();
    const cleanProxy = (outbound_proxy_url || "").trim();

    // 0. Strict check: Ensure the same IP or Proxy is NOT assigned to another user!
    if (cleanIp || cleanProxy) {
      // Check in user_profiles
      let profQuery = supabase
        .from("user_profiles")
        .select("id, email, full_name, dedicated_ip, outbound_proxy_url")
        .neq("id", targetUserId);

      if (cleanIp && cleanProxy) {
        profQuery = profQuery.or(`dedicated_ip.eq.${cleanIp},outbound_proxy_url.eq.${cleanProxy}`);
      } else if (cleanIp) {
        profQuery = profQuery.eq("dedicated_ip", cleanIp);
      } else if (cleanProxy) {
        profQuery = profQuery.eq("outbound_proxy_url", cleanProxy);
      }

      const { data: conflictingProfiles, error: confProfErr } = await profQuery;
      if (confProfErr) throw confProfErr;

      if (conflictingProfiles && conflictingProfiles.length > 0) {
        const conflict = conflictingProfiles[0];
        const conflictEmail = conflict.email || conflict.full_name || conflict.id;
        return NextResponse.json(
          {
            error: `IP Conflict: ${cleanIp || cleanProxy} is already assigned to another user (${conflictEmail}). Each user must have a unique dedicated IP.`,
          },
          { status: 409 }
        );
      }

      // Check in user_broker_accounts
      let brokerQuery = supabase
        .from("user_broker_accounts")
        .select("id, user_id, broker, client_id, dedicated_ip, outbound_proxy_url")
        .neq("user_id", targetUserId);

      if (cleanIp && cleanProxy) {
        brokerQuery = brokerQuery.or(`dedicated_ip.eq.${cleanIp},outbound_proxy_url.eq.${cleanProxy}`);
      } else if (cleanIp) {
        brokerQuery = brokerQuery.eq("dedicated_ip", cleanIp);
      } else if (cleanProxy) {
        brokerQuery = brokerQuery.eq("outbound_proxy_url", cleanProxy);
      }

      const { data: conflictingBrokers, error: confBrkErr } = await brokerQuery;
      if (confBrkErr) throw confBrkErr;

      if (conflictingBrokers && conflictingBrokers.length > 0) {
        const conflictBrk = conflictingBrokers[0];
        return NextResponse.json(
          {
            error: `IP Conflict: ${cleanIp || cleanProxy} is already assigned to another broker account (User ID: ${conflictBrk.user_id}). Each user must have a unique dedicated IP.`,
          },
          { status: 409 }
        );
      }

      // Check in outbound_proxy_pool
      if (cleanProxy || cleanIp) {
        let poolQuery = supabase
          .from("outbound_proxy_pool")
          .select("id, proxy_url, dedicated_ip, assigned_user_id")
          .not("assigned_user_id", "is", null)
          .neq("assigned_user_id", targetUserId);

        if (cleanProxy) {
          poolQuery = poolQuery.eq("proxy_url", cleanProxy);
        } else if (cleanIp) {
          poolQuery = poolQuery.eq("dedicated_ip", cleanIp);
        }

        const { data: conflictingPool, error: poolErr } = await poolQuery;
        if (poolErr) throw poolErr;

        if (conflictingPool && conflictingPool.length > 0) {
          return NextResponse.json(
            {
              error: `IP Conflict: Proxy pool marks this IP as already allocated to another user. Please choose an unassigned proxy from the pool.`,
            },
            { status: 409 }
          );
        }
      }
    }

    // 1. Update or upsert user_profiles
    const { error: profErr } = await supabase
      .from("user_profiles")
      .update({
        dedicated_ip: cleanIp || null,
        outbound_proxy_url: cleanProxy || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (profErr) throw profErr;

    // 2. Also update user_broker_accounts if an active row exists
    await supabase
      .from("user_broker_accounts")
      .update({
        dedicated_ip: cleanIp || null,
        outbound_proxy_url: cleanProxy || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId);

    // 3. If outbound_proxy_pool exists, update assigned_user_id
    if (cleanProxy) {
      await supabase
        .from("outbound_proxy_pool")
        .update({
          assigned_user_id: targetUserId,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("proxy_url", cleanProxy);
    }

    return NextResponse.json({
      success: true,
      message: `Dedicated IP ${cleanIp || "cleared"} assigned to user successfully.`,
      user_id: targetUserId,
      dedicated_ip: cleanIp,
      outbound_proxy_url: cleanProxy,
    });
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
