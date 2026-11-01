// Admin session verification shared by middleware (edge runtime) and API routes.
// Uses plain fetch against Supabase Auth/REST so it runs anywhere.

export const SESSION_COOKIE = "algovested_admin_session";
export const REFRESH_COOKIE = "algovested_admin_refresh";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuwmtepfsdsoatsygfoj.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Verified emails that are always admins, in addition to role = "admin".
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "pavansn.2510@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

async function getUser(accessToken) {
  if (!accessToken || !ANON_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json();
}

async function profileRole(userId) {
  if (!SERVICE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}&select=role,full_name`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const rows = await res.json().catch(() => []);
  return rows?.[0] || null;
}

// Never trusts user_metadata: users can edit their own user_metadata.
export async function adminFromToken(accessToken) {
  const user = await getUser(accessToken);
  if (!user?.id) return null;
  const profile = await profileRole(user.id);
  const isAdmin =
    user.app_metadata?.role === "admin" ||
    profile?.role === "admin" ||
    (Boolean(user.email_confirmed_at) && ADMIN_EMAILS.includes(String(user.email || "").toLowerCase()));
  if (!isAdmin) return null;
  return { id: user.id, email: user.email, full_name: profile?.full_name || "Admin" };
}

export async function refreshSession(refreshToken) {
  if (!refreshToken || !ANON_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json();
}

export function setSessionCookies(response, session) {
  const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" };
  response.cookies.set(SESSION_COOKIE, session.access_token, { ...base, maxAge: session.expires_in || 3600 });
  if (session.refresh_token) response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...base, maxAge: 60 * 60 * 12 });
}

export function clearSessionCookies(response) {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete("algovested_admin_user");
}
