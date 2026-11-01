"use client";

import { useState, useEffect } from "react";
import { ipFromProxyUrl } from "@/lib/proxy";
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

const NAV = [
  { id: "purchases", label: "Purchases", Icon: ShieldCheck },
  { id: "notifications", label: "Alerts", Icon: AlertCircle },
  { id: "users", label: "Users", Icon: Users },
  { id: "crons", label: "Cron jobs", Icon: Clock },
  { id: "proxies", label: "IP pool", Icon: Server },
  { id: "emails", label: "Email log", Icon: Mail },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'crons' | 'proxies' | 'emails'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editProxy, setEditProxy] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Crons State
  const [cronJobs, setCronJobs] = useState([]);
  const [cronRuns, setCronRuns] = useState([]);
  const [triggeringJob, setTriggeringJob] = useState(null);

  // Proxies State
  const [proxies, setProxies] = useState([]);
  const [newProxyUrl, setNewProxyUrl] = useState("");
  const [addingProxy, setAddingProxy] = useState(false);

  // Emails State
  const [emailLogs, setEmailLogs] = useState([]);

  // Subscriptions & Notifications State
  const [subscriptions, setSubscriptions] = useState([]);
  const [pendingIpCount, setPendingIpCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const badges = { purchases: pendingIpCount, notifications: unreadAlerts };

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
    loadSubscriptions();
    loadNotifications();
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

  const loadSubscriptions = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions");
      const data = await res.json();
      if (data.subscriptions) setSubscriptions(data.subscriptions);
      if (data.pending_ip_count != null) setPendingIpCount(data.pending_ip_count);
    } catch (err) {
      console.error("Subs load error:", err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
      if (data.unread_count != null) setUnreadAlerts(data.unread_count);
    } catch (err) {
      console.error("Alerts load error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      loadNotifications();
    } catch (err) {}
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
          dedicated_ip: ipFromProxyUrl(editProxy) || "",
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
    if (!ipFromProxyUrl(newProxyUrl)) return;
    setAddingProxy(true);
    try {
      const res = await fetch("/api/admin/ip-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dedicated_ip: ipFromProxyUrl(newProxyUrl),
          proxy_url: newProxyUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add proxy");
      setToast({ type: "success", message: "New proxy IP added to pool!" });
      setNewProxyUrl("");
      loadProxies();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setAddingProxy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf8f3] text-stone-900">
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

      {/* Sidebar on wide screens, tab strip on phones. */}
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#e7dfd1] bg-white lg:flex">
          <div className="flex items-center gap-3 px-5 py-5">
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
            <div>
              <p className="text-[15px] font-extrabold tracking-tight">Algovested</p>
              <p className="text-xs font-medium text-stone-500">Admin console</p>
            </div>
          </div>
          <nav aria-label="Sections" className="flex-1 space-y-1 px-3">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activeTab === id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {badges[id] ? (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === id ? "bg-amber-400 text-stone-900" : "bg-amber-100 text-amber-900"}`}>{badges[id]}</span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="border-t border-[#e7dfd1] p-4 text-xs text-stone-500">
            <p className="flex items-center gap-1.5 font-semibold text-stone-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Supabase connected
            </p>
            <p className="mt-0.5 font-mono">iuwmtepfsdsoatsygfoj</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#e7dfd1] bg-[#fbf8f3]/90 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
              <div className="flex items-center gap-3">
                <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg lg:hidden" />
                <h1 className="text-lg font-extrabold tracking-tight">{NAV.find((n) => n.id === activeTab)?.label}</h1>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://www.algovested.com" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 sm:inline-flex">
                  Public site <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={async () => {
                    await fetch("/api/auth", { method: "DELETE" });
                    window.location.href = "/login";
                  }}
                  className="rounded-lg border border-[#e7dfd1] bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Log out
                </button>
              </div>
            </div>
            <nav aria-label="Sections" className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${activeTab === id ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-[#e7dfd1]"}`}
                >
                  {label}{badges[id] ? ` (${badges[id]})` : ""}
                </button>
              ))}
            </nav>
          </header>

          <section aria-label="Overview" className="grid grid-cols-2 gap-3 px-4 pt-6 sm:px-8 xl:grid-cols-5">
            {[
              { label: "Paid users needing an IP", value: pendingIpCount, tab: "purchases", urgent: pendingIpCount > 0 },
              { label: "Unread alerts", value: unreadAlerts, tab: "notifications", urgent: unreadAlerts > 0 },
              { label: "Users", value: users.length, tab: "users" },
              { label: "Failed cron jobs", value: cronJobs.filter((j) => j.current_status === "failed").length, tab: "crons", urgent: cronJobs.some((j) => j.current_status === "failed") },
              { label: "IPs free in pool", value: proxies.filter((p) => !p.assigned_user_id).length, tab: "proxies" },
            ].map((k) => (
              <button
                key={k.label}
                onClick={() => setActiveTab(k.tab)}
                className={`rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm ${k.urgent ? "border-amber-300" : "border-[#e7dfd1]"}`}
              >
                <p className="text-xs font-semibold text-stone-500">{k.label}</p>
                <p className={`mt-1 text-2xl font-extrabold tabular-nums ${k.urgent ? "text-amber-700" : "text-stone-900"}`}>{k.value}</p>
              </button>
            ))}
          </section>

      <main className="px-4 py-6 sm:px-8">
        {/* ── TAB: PURCHASES & PAID USERS (NEEDS IP PRIORITY) ── */}
        {activeTab === "purchases" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[#e7dfd1] bg-white p-4 shadow-xs">
              <div>
                <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                  <span>Paid Subscriptions &amp; Deployments</span>
                  {pendingIpCount > 0 && (
                    <span className="rounded-full bg-rose-100 border border-rose-300 text-rose-800 px-2 py-0.5 text-xs font-black">
                      ⚠️ {pendingIpCount} Paid Users Awaiting Dedicated Static IP
                    </span>
                  )}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Users who purchased a plan but do NOT yet have an outbound proxy assigned are surfaced at the very top.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadSubscriptions}
                  className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="overflow-hidden rounded-2xl border border-[#e7dfd1] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#ede5d8] bg-stone-50/70 text-[11px] font-extrabold uppercase text-stone-600">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Plan Purchased</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Subscription Status</th>
                      <th className="py-3 px-4">Static IP Allocation</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ebe0]">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-stone-500">
                          No subscriptions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr
                          key={sub.id}
                          className={`transition ${
                            !sub.is_ip_configured && sub.status === "active"
                              ? "bg-rose-50/50 hover:bg-rose-50/80"
                              : "hover:bg-stone-50/40"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">{sub.user_email}</div>
                            <div className="text-[11px] text-stone-500">
                              {sub.full_name} &bull; Bought {new Date(sub.created_at).toLocaleDateString("en-IN")}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900">{sub.plan_name}</span>
                            <div className="text-[11px] text-stone-500 font-mono">
                              Period ends: {new Date(sub.current_period_end).toLocaleDateString("en-IN")}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            ₹{Number(sub.amount_inr).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                                sub.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {sub.status}
                            </span>
                            {sub.cancelled_at && (
                              <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                                Cancelled {new Date(sub.cancelled_at).toLocaleDateString("en-IN")}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {sub.is_ip_configured ? (
                              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="font-mono">{sub.dedicated_ip || "Proxy Active"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 font-bold text-rose-600 animate-pulse">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span>NO IP CONFIGURED (Action Required)</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedUser({ id: sub.user_id, email: sub.user_email });
                                setEditProxy(sub.outbound_proxy_url || "");
                              }}
                              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition shadow-xs ${
                                !sub.is_ip_configured
                                  ? "bg-rose-600 text-white hover:bg-rose-700"
                                  : "bg-stone-900 text-white hover:bg-stone-800"
                              }`}
                            >
                              {!sub.is_ip_configured ? "🚨 Assign IP Now" : "Edit IP"}
                            </button>
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

        {/* ── TAB: LIVE ALERTS & CANCELLATIONS ── */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-[#e7dfd1] bg-white p-4 shadow-xs">
              <div>
                <h2 className="text-sm font-extrabold text-stone-900">Live Gateway &amp; Billing Alerts</h2>
                <p className="text-xs text-stone-500">Real-time webhooks for new purchases, cancellations, and proxy requests.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  Mark All Read
                </button>
                <button
                  onClick={loadNotifications}
                  className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-400">
                  No alerts triggered. System operating smoothly.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-2xl border p-4 transition ${
                      n.event_type === "SUBSCRIPTION_CANCELLED"
                        ? "border-rose-200 bg-rose-50/70 text-rose-950"
                        : n.event_type === "PURCHASE_NEEDS_IP"
                        ? "border-amber-200 bg-amber-50/70 text-amber-950"
                        : "border-stone-200 bg-white text-stone-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${
                          n.event_type === "SUBSCRIPTION_CANCELLED" ? "text-rose-600" : "text-amber-600"
                        }`} />
                        <div>
                          <h4 className="font-bold text-xs">{n.title}</h4>
                          <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-500">
                            <span className="font-mono">{new Date(n.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>
                            <span>&bull;</span>
                            <span className="font-bold uppercase">{n.event_type}</span>
                          </div>
                        </div>
                      </div>

                      {n.event_type === "PURCHASE_NEEDS_IP" && n.user_id && (
                        <button
                          onClick={() => {
                            setSelectedUser({ id: n.user_id, email: n.user_email });
                            setEditProxy("");
                          }}
                          className="shrink-0 rounded-xl bg-amber-600 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-amber-700 transition"
                        >
                          Assign IP
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${
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
                                <div className="text-[11px] text-stone-500 uppercase">{u.broker_account.mode} MODE</div>
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
                        {editProxy
                          ? ipFromProxyUrl(editProxy)
                            ? <>Dedicated IP: <span className="font-mono font-semibold text-stone-800">{ipFromProxyUrl(editProxy)}</span>. Orders from this user go through this proxy.</>
                            : <span className="text-rose-700">That doesn't look like a proxy URL. Use http://user:pass@ip:port.</span>
                          : "The dedicated IP is read from the URL. Orders from this user go through this proxy."}
                      </p>
                    </div>

                    {/* Quick Pick from Pool */}
                    {proxies.length > 0 && (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-stone-700 text-[11px]">Quick Pick from Available Proxy Pool:</span>
                          <span className="text-[11px] text-stone-400">Strictly 1 IP per user</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {proxies.map((px) => {
                            const isAssignedToOther = px.assigned_user_id && px.assigned_user_id !== selectedUser.id;
                            return (
                              <button
                                key={px.id}
                                type="button"
                                disabled={isAssignedToOther}
                                title={isAssignedToOther ? "Already allocated to another user" : "Available"}
                                onClick={() => {
                                  setEditProxy(px.proxy_url);
                                }}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-mono font-bold transition ${
                                  isAssignedToOther
                                    ? "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed line-through"
                                    : "border-stone-300 bg-white text-stone-800 hover:border-emerald-500 hover:bg-emerald-50"
                                }`}
                              >
                                {px.dedicated_ip} {isAssignedToOther ? "(In Use)" : "(Available)"}
                              </button>
                            );
                          })}
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
                {cronJobs.map((j) => {
                  const statusColors = {
                    in_progress: "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
                    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    scheduled: "bg-amber-50 text-amber-800 border-amber-200",
                    failed: "bg-rose-100 text-rose-800 border-rose-200",
                    disabled: "bg-stone-100 text-stone-600 border-stone-200",
                  };

                  const statusLabels = {
                    in_progress: "In Progress",
                    completed: "Completed",
                    scheduled: "Scheduled",
                    failed: "Failed",
                    disabled: "Disabled",
                  };

                  return (
                    <div key={j.jobid} className="rounded-2xl border border-[#e7dfd1] bg-white p-4 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="mono rounded bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600">
                            #{j.jobid} &bull; {j.schedule}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase border ${statusColors[j.current_status] || statusColors.scheduled}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              j.current_status === "completed"
                                ? "bg-emerald-500"
                                : j.current_status === "in_progress"
                                ? "bg-blue-500"
                                : j.current_status === "failed"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`} />
                            {statusLabels[j.current_status] || "Scheduled"}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-xs text-stone-900 mt-2.5">{j.jobname}</h3>
                        
                        {/* Last Run & Status Details */}
                        <div className="mt-2 space-y-1 rounded-xl bg-stone-50/80 p-2 text-[11px] border border-stone-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-500">Last Run:</span>
                            <span className="font-mono font-medium text-stone-800">
                              {j.last_run_start_time
                                ? new Date(j.last_run_start_time).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }) + " IST"
                                : "Never executed"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-500">Current Status:</span>
                            <span className="font-bold capitalize text-stone-900">
                              {statusLabels[j.current_status] || "Scheduled"}
                            </span>
                          </div>

                          {j.last_run_message && (
                            <div className="flex items-center justify-between pt-0.5 border-t border-stone-200/50">
                              <span className="font-bold text-stone-500">Result:</span>
                              <span className="font-mono text-[11px] text-stone-700 truncate max-w-[140px]">
                                {j.last_run_message}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400 font-medium">Auto-fires via pg_cron</span>
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
                  );
                })}
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
                              <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-extrabold uppercase ${
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
              <form onSubmit={handleAddProxy} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 text-xs items-start">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Proxy URL (with Auth)</label>
                  <input
                    type="text"
                    placeholder="http://user:pass@ip:port"
                    value={newProxyUrl}
                    onChange={(e) => setNewProxyUrl(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 font-mono"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    {newProxyUrl
                      ? ipFromProxyUrl(newProxyUrl)
                        ? <>Dedicated IP: <span className="font-mono font-semibold text-stone-800">{ipFromProxyUrl(newProxyUrl)}</span></>
                        : <span className="text-rose-700">Use the format http://user:pass@ip:port.</span>
                      : "The dedicated IP is read from the URL."}
                  </p>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={addingProxy || !ipFromProxyUrl(newProxyUrl)}
                    className="w-full rounded-xl bg-stone-900 py-2.5 px-4 font-bold text-white hover:bg-stone-800 disabled:opacity-50 sm:mt-5"
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
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                              Assigned ({p.assigned_user_id.slice(0, 8)}...)
                            </span>
                          ) : (
                            <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 border border-stone-200">
                              Available in Pool
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-extrabold uppercase ${
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
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-stone-400 truncate max-w-[150px]">
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
      </div>
    </div>
  );
}
