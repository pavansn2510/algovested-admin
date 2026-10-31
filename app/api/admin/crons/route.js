import { NextResponse } from "next/server";
import { executeAdminSql } from "@/lib/supabase-admin";

export async function GET() {
  try {
    // 1. Query cron jobs list
    const jobsSql = `
      SELECT 
        jobid, 
        jobname, 
        schedule, 
        active, 
        command
      FROM cron.job
      ORDER BY jobid ASC;
    `;
    const jobs = await executeAdminSql(jobsSql);

    // 2. Query recent cron execution details & logs
    const runsSql = `
      SELECT 
        l.runid,
        l.jobid,
        j.jobname,
        l.status,
        l.return_message,
        l.start_time,
        l.end_time
      FROM cron.job_run_details l
      JOIN cron.job j ON j.jobid = l.jobid
      ORDER BY l.start_time DESC
      LIMIT 50;
    `;
    const runs = await executeAdminSql(runsSql);

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      runs: runs || [],
    });
  } catch (err) {
    console.error("GET /api/admin/crons error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Trigger a cron job immediately on-demand
export async function POST(request) {
  try {
    const body = await request.json();
    const { jobname } = body;

    if (!jobname) {
      return NextResponse.json({ error: "jobname is required" }, { status: 400 });
    }

    // Map jobname to edge function URL
    const edgeFunctionMap = {
      "send-daily-batman-digest-morning": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/send-daily-batman-digest",
      "send-daily-ip-config-alert": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/send-ip-configuration-alert",
      "sync-15m-market-data-cron": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/sync-15m-market-data",
      "check-batman-adjustments-cron": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/check-batman-adjustments",
      "refresh-dhan-tokens-cron": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/refresh-dhan-tokens",
      "set-batman-target-sl-cron": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/set-batman-target-sl",
      "calculate-daily-margins-cron": "https://iuwmtepfsdsoatsygfoj.supabase.co/functions/v1/refresh-dhan-tokens",
    };

    const targetUrl = edgeFunctionMap[jobname];
    if (!targetUrl) {
      return NextResponse.json({ error: `Unknown job ${jobname}` }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ source: "admin_manual_trigger", force: true }),
    });

    const resJson = await resp.json().catch(() => ({}));

    return NextResponse.json({
      success: resp.ok,
      status: resp.status,
      jobname,
      response: resJson,
    });
  } catch (err) {
    console.error("POST /api/admin/crons trigger error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
