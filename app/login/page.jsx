"use client";

import { useState } from "react";
import { ShieldAlert, Lock, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Redirect to admin console
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbf8f3] p-4">
      <div className="w-full max-w-md">
        
        {/* Brand Card */}
        <div className="text-center mb-6">
          <img src="/icon.svg" alt="" className="mx-auto mb-3 h-12 w-12 rounded-2xl" />
          <h1 className="text-xl font-extrabold tracking-tight text-stone-900">Algovested admin</h1>
          <p className="mt-1 text-sm text-stone-500">Restricted access</p>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-[#e7dfd1] bg-white p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-stone-100">
            <Lock className="h-4 w-4 text-stone-700" />
            <h2 className="text-[15px] font-bold text-stone-900">Sign in</h2>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@algovested.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 px-4 font-bold text-white hover:bg-stone-800 transition disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>IP logged &amp; monitored. Unauthorized access is forbidden.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
