import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuwmtepfsdsoatsygfoj.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Server-side admin client with service_role privilege
export function getAdminSupabase() {
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin server client");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Execute arbitrary SQL via Supabase Management API
export async function executeAdminSql(sqlQuery) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF || "iuwmtepfsdsoatsygfoj";

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sqlQuery }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Management SQL query failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

// GET from the Supabase Management API (same token as executeAdminSql).
export async function managementGet(path, params = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF || "iuwmtepfsdsoatsygfoj";
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not set");
  const url = new URL(`https://api.supabase.com/v1/projects/${ref}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 429) {
    const err = new Error("Supabase allows only a few log queries a minute. Try again shortly.");
    err.status = 429;
    throw err;
  }
  if (!res.ok) throw new Error(`Management API ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
