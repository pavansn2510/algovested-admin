"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

const RANGES = [["1", "Last hour"], ["6", "Last 6 hours"], ["24", "Last 24 hours"]];
const KINDS = [["all", "Everything"], ["invocations", "Invocations"], ["console", "Console output"], ["errors", "Errors only"]];
const TIME = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

function Badge({ log }) {
  if (log.type === "invocation") {
    const bad = (log.status_code || 0) >= 400;
    return <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ${bad ? "bg-rose-50 text-rose-700" : "bg-stone-100 text-stone-700"}`}>{log.method} {log.status_code ?? "—"}</span>;
  }
  const level = (log.level || "log").toLowerCase();
  const tone = level === "error" ? "bg-rose-50 text-rose-700" : level === "warning" ? "bg-amber-50 text-amber-800" : "bg-stone-100 text-stone-600";
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase ${tone}`}>{level}</span>;
}

// Logs for one Supabase edge function, with filters for time, type and text.
export default function FunctionLogs() {
  const [functions, setFunctions] = useState([]);
  const [fn, setFn] = useState("");
  const [hours, setHours] = useState("24");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [execution, setExecution] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/function-logs")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setFunctions(d.functions || []);
        setFn((cur) => cur || d.functions?.find((f) => f.slug === "check-batman-adjustments")?.slug || d.functions?.[0]?.slug || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(async () => {
    if (!fn) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/function-logs?fn=${encodeURIComponent(fn)}&hours=${hours}&kind=${kind}`);
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error || "Could not load logs");
      setLogs(d.logs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fn, hours, kind]);

  useEffect(() => { setExecution(null); load(); }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (logs || []).filter((l) => (!execution || l.execution_id === execution) && (!q || l.message.toLowerCase().includes(q)));
  }, [logs, query, execution]);

  const select = "rounded-xl border border-[#e7dfd1] bg-white px-3 py-2 text-sm font-medium";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#e7dfd1] bg-white p-4">
        <label className="text-xs font-semibold text-stone-500">
          Function
          <select className={`${select} mt-1 block min-w-56`} value={fn} onChange={(e) => setFn(e.target.value)}>
            {functions.map((f) => <option key={f.id} value={f.slug}>{f.slug}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-500">
          Time
          <select className={`${select} mt-1 block`} value={hours} onChange={(e) => setHours(e.target.value)}>
            {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-500">
          Show
          <select className={`${select} mt-1 block`} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="min-w-48 flex-1 text-xs font-semibold text-stone-500">
          Search messages
          <span className="relative mt-1 block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input className={`${select} w-full pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. STOP_LOSS, 401, proxy" />
          </span>
        </label>
        <button onClick={load} disabled={loading || !fn} className="inline-flex items-center gap-1.5 rounded-xl border border-[#e7dfd1] bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {execution && (
        <p className="text-sm text-stone-600">
          Showing one run (<span className="font-mono">{execution.slice(0, 8)}</span>).{" "}
          <button className="font-semibold text-stone-900 underline" onClick={() => setExecution(null)}>Show all runs</button>
        </p>
      )}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-[#e7dfd1] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#e7dfd1] bg-stone-50 text-xs font-semibold text-stone-500">
            <tr>
              <th className="px-4 py-2.5">Time (IST)</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Message</th>
              <th className="px-4 py-2.5 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {logs === null && !error && <tr><td colSpan={4} className="px-4 py-8 text-center text-stone-500">Loading…</td></tr>}
            {logs && shown.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-stone-500">No logs for this filter.</td></tr>}
            {shown.map((l, i) => (
              <tr key={`${l.timestamp}-${i}`} className="align-top hover:bg-stone-50/60">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-stone-600">{TIME.format(new Date(l.timestamp))}</td>
                <td className="px-4 py-2"><Badge log={l} /></td>
                <td className="px-4 py-2">
                  <span className="whitespace-pre-wrap break-words font-mono text-xs text-stone-800">{l.message}</span>
                  {l.execution_id && !execution && (
                    <button className="ml-2 text-[11px] font-semibold text-stone-500 underline hover:text-stone-900" onClick={() => setExecution(l.execution_id)}>this run</button>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-xs text-stone-600">{l.execution_time_ms != null ? `${l.execution_time_ms} ms` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs && <p className="text-xs text-stone-500">{shown.length} of {logs.length} entries (newest 300 per query).</p>}
    </div>
  );
}
