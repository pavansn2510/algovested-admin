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
