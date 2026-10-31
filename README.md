# Algovested Admin Console (admin.algovested.com)

Internal quantitative and broker gateway operations dashboard for **Algovested**.

## Features
- **User Search & Dedicated IP Allocation**: Search registered users by email address or name, assign or edit dedicated static IPs, and configure their secure outbound proxy tunnels for DhanHQ compliance.
- **Outbound IP Pool Management**: Monitor existing static proxies, check Dhan IP whitelist sync status, and add new proxy IPs to the multi-user pool.
- **Production Cron Job Telemetry**: View all active `pg_cron` jobs, check recent execution histories, review return messages/logs, and trigger jobs on-demand.
- **Email Audit Logs**: Full history of automated daily digest dispatches, strategy updates, and alert emails with SMTP Message IDs.

## Vercel Deployment Instructions
1. Connect this repository (`pavansn2510/algovested-admin`) to **Vercel**.
2. Set Custom Domain: `admin.algovested.com`.
3. Add the following Environment Variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://iuwmtepfsdsoatsygfoj.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - `SUPABASE_ACCESS_TOKEN`: Your Supabase Personal Access Token
   - `SUPABASE_PROJECT_REF`: `iuwmtepfsdsoatsygfoj`
