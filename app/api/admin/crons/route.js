import { NextResponse } from "next/server";
import { executeAdminSql } from "@/lib/supabase-admin";

export async function GET() {
  try {
    // 1. Query cron jobs list with their latest run status & timing
    const jobsSql = `
      SELECT 
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        j.command,
        last_run.runid AS last_run_id,
        last_run.status AS last_run_status,
        last_run.return_message AS last_run_message,
        last_run.start_time AS last_run_start_time,
        last_run.end_time AS last_run_end_time
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT runid, status, return_message, start_time, end_time
        FROM cron.job_run_details d
        WHERE d.jobid = j.jobid
        ORDER BY d.start_time DESC
        LIMIT 1
      ) last_run ON true
      ORDER BY j.jobid ASC;
    `;
    const rawJobs = await executeAdminSql(jobsSql);

    // Compute live status: 'in_progress', 'completed', 'scheduled', or 'failed'
    const jobs = (rawJobs || []).map((j) => {
      let current_status = "scheduled";
      const lastStatus = j.last_run_status?.toLowerCase();
      const hasEnded = Boolean(j.last_run_end_time);

      if (!j.active) {
        current_status = "disabled";
      } else if (j.last_run_start_time && !hasEnded && lastStatus !== "succeeded" && lastStatus !== "failed") {
        current_status = "in_progress";
      } else if (lastStatus === "succeeded") {
        current_status = "completed";
      } else if (lastStatus === "failed") {
        current_status = "failed";
      } else {
        current_status = "scheduled";
      }

      return {
        ...j,
        current_status,
      };
    });

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
