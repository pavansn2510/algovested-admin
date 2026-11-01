import { NextResponse } from "next/server";
import { managementGet } from "@/lib/supabase-admin";

// Edge function logs, filtered to one function. Logs come from the Management API's unified
// `logs` table (ClickHouse SQL): invocations are source 'function_edge_logs' (method, status,
// duration) and console output is source 'function_logs' (level, message).

const KINDS = {
  all: "source IN ('function_edge_logs', 'function_logs')",
  invocations: "source = 'function_edge_logs'",
  console: "source = 'function_logs'",
  errors: "((source = 'function_logs' AND log_attributes['level'] IN ('error', 'warning')) OR (source = 'function_edge_logs' AND toInt32OrZero(log_attributes['response.status_code']) >= 400))",
};
// The logs API searches at most 24 hours from the start time, so longer windows would miss the newest rows.
const MAX_HOURS = 24;

let functionsCache = { at: 0, list: [] };
async function listFunctions() {
  if (Date.now() - functionsCache.at < 10 * 60 * 1000 && functionsCache.list.length) return functionsCache.list;
  const fns = await managementGet("/functions");
  functionsCache = { at: Date.now(), list: (fns || []).map((f) => ({ id: f.id, slug: f.slug, status: f.status, version: f.version })) };
  return functionsCache.list;
}

// The logs API allows only a few queries a minute, so identical requests share a short cache.
const resultCache = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const functions = await listFunctions();
    const slug = searchParams.get("fn");
    if (!slug) return NextResponse.json({ functions });

    // The slug is only ever matched against the real function list, never put into SQL.
    const fn = functions.find((f) => f.slug === slug);
    if (!fn) return NextResponse.json({ error: "Unknown function" }, { status: 400 });
    const kind = KINDS[searchParams.get("kind")] ? searchParams.get("kind") : "all";
    const hours = Math.min(MAX_HOURS, Math.max(1, Number(searchParams.get("hours")) || 24));

    const key = `${fn.id}|${kind}|${hours}`;
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.at < 30 * 1000) return NextResponse.json({ functions, logs: cached.logs, cached: true });

    const sql = `
      SELECT
        timestamp,
        source,
        event_message,
        log_attributes['level'] AS level,
        log_attributes['request.method'] AS method,
        log_attributes['response.status_code'] AS status_code,
        log_attributes['execution_time_ms'] AS execution_time_ms,
        log_attributes['execution_id'] AS execution_id
      FROM logs
      WHERE log_attributes['function_id'] = '${fn.id}' AND ${KINDS[kind]}
      ORDER BY timestamp DESC
      LIMIT 300`;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    const data = await managementGet("/analytics/endpoints/logs", {
      sql,
      iso_timestamp_start: start.toISOString(),
      iso_timestamp_end: end.toISOString(),
    });
    if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));

    const logs = (data?.result || []).map((r) => ({
      timestamp: r.timestamp?.endsWith("Z") ? r.timestamp : `${r.timestamp}Z`,
      type: r.source === "function_edge_logs" ? "invocation" : "console",
      level: r.level || null,
      method: r.method || null,
      status_code: r.status_code ? Number(r.status_code) : null,
      execution_time_ms: r.execution_time_ms ? Number(r.execution_time_ms) : null,
      execution_id: r.execution_id || null,
      message: r.event_message || "",
    }));
    resultCache.set(key, { at: Date.now(), logs });
    return NextResponse.json({ functions, logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 500 });
  }
}
