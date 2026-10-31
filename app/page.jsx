"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Server,
  Activity,
  Mail,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Play,
  Copy,
  ExternalLink,
  Plus,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'crons' | 'proxies' | 'emails'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editIp, setEditIp] = useState("");
  const [editProxy, setEditProxy] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Crons State
  const [cronJobs, setCronJobs] = useState([]);
  const [cronRuns, setCronRuns] = useState([]);
  const [triggeringJob, setTriggeringJob] = useState(null);

  // Proxies State
  const [proxies, setProxies] = useState([]);
  const [newProxyIp, setNewProxyIp] = useState("");
  const [newProxyUrl, setNewProxyUrl] = useState("");
  const [addingProxy, setAddingProxy] = useState(false);

  // Emails State
  const [emailLogs, setEmailLogs] = useState([]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Initial Data Fetch
  useEffect(() => {
    loadUsers();
    loadCrons();
    loadProxies();
    loadEmails();
  }, []);

  const loadUsers = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      setToast({ type: "error", message: "Failed to load users: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadCrons = async () => {
    try {
      const res = await fetch("/api/admin/crons");
      const data = await res.json();
      if (data.jobs) setCronJobs(data.jobs);
      if (data.runs) setCronRuns(data.runs);
    } catch (err) {
      console.error("Cron load error:", err);
    }
  };

  const loadProxies = async () => {
    try {
      const res = await fetch("/api/admin/ip-pool");
      const data = await res.json();
      if (data.proxies) setProxies(data.proxies);
    } catch (err) {
      console.error("Proxies load error:", err);
    }
  };

  const loadEmails = async () => {
    try {
      const res = await fetch("/api/admin/emails");
      const data = await res.json();
      if (data.logs) setEmailLogs(data.logs);
    } catch (err) {
      console.error("Emails load error:", err);
    }
  };

  const handleSaveIpAssignment = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          dedicated_ip: editIp,
          outbound_proxy_url: editProxy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setToast({ type: "success", message: `Updated IP configuration for ${selectedUser.email}` });
      setSelectedUser(null);
      loadUsers(searchQuery);
      loadProxies();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setSavingUser(false);
    }
  };

  const handleTriggerCron = async (jobname) => {
    setTriggeringJob(jobname);
    try {
      const res = await fetch("/api/admin/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution failed");
      setToast({ type: "success", message: `Triggered ${jobname} successfully!` });
      loadCrons();
    } catch (err) {
      setToast({ type: "error", message: `Trigger failed: ${err.message}` });
    } finally {
      setTriggeringJob(null);
    }
  };

  const handleAddProxy = async (e) => {
    e.preventDefault();
    if (!newProxyIp || !newProxyUrl) return;
    setAddingProxy(true);
    try {
      const res = await fetch("/api/admin/ip-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dedicated_ip: newProxyIp,
          proxy_url: newProxyUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add proxy");
      setToast({ type: "success", message: "New proxy IP added to pool!" });
      setNewProxyIp("");
      setNewProxyUrl("");
      loadProxies();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setAddingProxy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-lg transition-all ${
            toast.type === "error"
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#e7dfd1] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white font-extrabold text-sm shadow-xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-stone-900">ALGOVESTED</span>
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200 uppercase">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">admin.algovested.com &bull; Dhan Gateway Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected: iuwmtepfsdsoatsygfoj
            </span>
            <a
              href="https://algovested.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
            >
              Public App <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mx-auto flex max-w-7xl border-t border-stone-100 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === "users"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Users className="h-4 w-4" />
            Users &amp; IP Allocation ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("crons")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === "crons"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            Cron Status &amp; Logs ({cronJobs.length})
          </button>
          <button
            onClick={() => setActiveTab("proxies")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === "proxies"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Server className="h-4 w-4" />
            Outbound IP Pool ({proxies.length})
          </button>
          <button
            onClick={() => setActiveTab("emails")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === "emails"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Mail className="h-4 w-4" />
            Dispatched Emails ({emailLogs.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* ── TAB 1: USERS & IP ASSIGNMENT ── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search Strip */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-[#e7dfd1] bg-white p-4 shadow-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search user by email address, name, or dedicated IP..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    loadUsers(e.target.value);
                  }}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadUsers(searchQuery)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-2xl border border-[#e7dfd1] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#ede5d8] bg-stone-50/70 text-[11px] font-extrabold uppercase tracking-wider text-stone-600">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Broker Status</th>
                      <th className="py-3 px-4">Static IP Configuration</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ebe0]">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-stone-500">
                          {loading ? "Loading registered users..." : "No users matched the search query."}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-stone-50/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">{u.email}</div>
                            <div className="text-[11px] text-stone-500">{u.full_name} &bull; Joined {new Date(u.created_at).toLocaleDateString("en-IN")}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-stone-100 text-stone-700 border border-stone-200"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.broker_account ? (
                              <div>
                                <span className="font-bold text-emerald-800">{u.broker_account.broker}</span> ({u.broker_account.client_id})
                                <div className="text-[10px] text-stone-500 uppercase">{u.broker_account.mode} MODE</div>
                              </div>
                            ) : (
                              <span className="text-stone-400">No broker connected</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.is_ip_configured ? (
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="font-mono font-bold text-stone-800">{u.dedicated_ip || "Proxy Active"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span>Missing Proxy IP</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setEditIp(u.dedicated_ip || "");
                                setEditProxy(u.outbound_proxy_url || "");
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-stone-800 transition"
                            >
                              Assign / Edit IP
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit / Assign Modal */}
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-lg rounded-3xl border border-[#e7dfd1] bg-white p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-stone-900">Assign Dedicated IP</h3>
                      <p className="text-xs text-stone-500">{selectedUser.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveIpAssignment} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-stone-800 mb-1">
                        Dedicated Static IP (Whitelisted on Dhan)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 62.164.245.140"
                        value={editIp}
                        onChange={(e) => setEditIp(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 font-mono font-medium focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-800 mb-1">
                        Outbound Proxy URL (Format: http://user:pass@ip:port)
                      </label>
                      <input
                        type="text"
                        placeholder="http://wxbnxtwp:nbdxqr4k5pdq@62.164.245.140:7534"
                        value={editProxy}
                        onChange={(e) => setEditProxy(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 font-mono text-[11px] focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-stone-500">
                        Orders placed by this user will be routed strictly through this static proxy tunnel.
                      </p>
                    </div>

                    {/* Quick Pick from Pool */}
                    {proxies.length > 0 && (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                        <div className="font-bold text-stone-700 text-[11px] mb-1.5">Quick Pick from Available Proxy Pool:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {proxies.map((px) => (
                            <button
                              key={px.id}
                              type="button"
                              onClick={() => {
                                setEditIp(px.dedicated_ip);
                                setEditProxy(px.proxy_url);
                              }}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[10px] font-mono font-bold text-stone-800 hover:border-emerald-500"
                            >
                              {px.dedicated_ip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-600 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingUser}
                        className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {savingUser ? "Saving..." : "Save IP Assignment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CRON STATUS & EXECUTION LOGS ── */}
        {activeTab === "crons" && (
          <div className="space-y-6">
            {/* Active Cron Jobs Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-stone-900">Automated Production Cron Jobs (pg_cron)</h2>
                <button
                  onClick={loadCrons}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cronJobs.map((j) => (
                  <div key={j.jobid} className="rounded-2xl border border-[#e7dfd1] bg-white p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="mono rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                          #{j.jobid} &bull; {j.schedule}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs text-stone-900 mt-2">{j.jobname}</h3>
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 font-mono">
                        {j.command.slice(0, 100)}...
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 font-medium">Auto-fires via pg_cron</span>
                      <button
                        onClick={() => handleTriggerCron(j.jobname)}
                        disabled={triggeringJob === j.jobname}
                        className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        {triggeringJob === j.jobname ? "Triggering..." : "Trigger Now"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Execution Runs Table */}
            <div>
              <h2 className="text-sm font-extrabold text-stone-900 mb-3">Recent Cron Execution Runs (cron.job_run_details)</h2>
              <div className="overflow-hidden rounded-2xl border border-[#e7dfd1] bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#ede5d8] bg-stone-50/70 text-[11px] font-extrabold uppercase text-stone-600">
                        <th className="py-2.5 px-4">Start Time (IST)</th>
                        <th className="py-2.5 px-4">Job Name</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Result / Output Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2ebe0]">
                      {cronRuns.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-xs text-stone-400">
                            No recent execution runs recorded in history.
                          </td>
                        </tr>
                      ) : (
                        cronRuns.map((r) => (
                          <tr key={r.runid} className="hover:bg-stone-50/40">
                            <td className="py-2.5 px-4 font-mono text-[11px] text-stone-700 whitespace-nowrap">
                              {new Date(r.start_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-stone-900">{r.jobname}</td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                r.status === "succeeded"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-stone-600">
                              {r.return_message || "OK"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PROXY IP POOL ── */}
        {activeTab === "proxies" && (
          <div className="space-y-6">
            {/* Add New Proxy Form */}
            <div className="rounded-2xl border border-[#e7dfd1] bg-white p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-stone-900 mb-2">Add Dedicated Proxy to Pool</h3>
              <form onSubmit={handleAddProxy} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Dedicated IP</label>
                  <input
                    type="text"
                    placeholder="e.g. 62.164.245.140"
                    value={newProxyIp}
                    onChange={(e) => setNewProxyIp(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Proxy URL (with Auth)</label>
                  <input
                    type="text"
                    placeholder="http://user:pass@ip:port"
                    value={newProxyUrl}
                    onChange={(e) => setNewProxyUrl(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={addingProxy || !newProxyIp || !newProxyUrl}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 px-4 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {addingProxy ? "Adding..." : "+ Add to Proxy Pool"}
                  </button>
                </div>
              </form>
            </div>

            {/* Proxies Table */}
            <div className="overflow-hidden rounded-2xl border border-[#e7dfd1] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#ede5d8] bg-stone-50/70 text-[11px] font-extrabold uppercase text-stone-600">
                      <th className="py-3 px-4">Static IP</th>
                      <th className="py-3 px-4">Full Proxy URL</th>
                      <th className="py-3 px-4">Assignment Status</th>
                      <th className="py-3 px-4">Dhan Whitelist Sync</th>
                      <th className="py-3 px-4">Last Synced</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ebe0]">
                    {proxies.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/40">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">{p.dedicated_ip}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600">{p.proxy_url}</td>
                        <td className="py-3 px-4">
                          {p.assigned_user_id ? (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              Assigned ({p.assigned_user_id.slice(0, 8)}...)
                            </span>
                          ) : (
                            <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
                              Available in Pool
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            p.dhan_ip_synced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {p.dhan_ip_status || (p.dhan_ip_synced ? "SYNCED" : "PENDING")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-stone-500">
                          {p.last_synced_at ? new Date(p.last_synced_at).toLocaleString("en-IN") : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: EMAIL AUDIT LOGS ── */}
        {activeTab === "emails" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-stone-900">Email Notification Dispatches (public.email_notifications_log)</h2>
              <button
                onClick={loadEmails}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e7dfd1] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#ede5d8] bg-stone-50/70 text-[11px] font-extrabold uppercase text-stone-600">
                      <th className="py-2.5 px-4">Dispatch Timestamp</th>
                      <th className="py-2.5 px-4">Recipient</th>
                      <th className="py-2.5 px-4">Subject</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">SMTP Message ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ebe0]">
                    {emailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-stone-400">
                          No email dispatches recorded yet.
                        </td>
                      </tr>
                    ) : (
                      emailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50/40">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-stone-900">{log.recipient_email}</td>
                          <td className="py-2.5 px-4 text-stone-700 max-w-xs truncate">{log.subject}</td>
                          <td className="py-2.5 px-4">
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[10px] text-stone-400 truncate max-w-[150px]">
                            {log.smtp_message_id}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
