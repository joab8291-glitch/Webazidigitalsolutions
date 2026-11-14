# Webazi Agency Admin

Standalone Vite + React admin frontend intended for the Vercel project rooted at `admin-dashboard/`, with the custom domain `admin.webazi.co.ke`.

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Set the Supabase project URL and anon/publishable key. Never use a service-role key in browser code.
3. Run `npm install` and `npm run dev`.

## Deploy
Create a separate Vercel project from this same repository with Root Directory set to `admin-dashboard`. Add the two `VITE_SUPABASE_*` environment variables, deploy, then attach `admin.webazi.co.ke`.

## Database
Apply `../supabase/migrations/20261114_agency_admin.sql` in the existing Supabase project's SQL Editor. Add the intended administrator's existing Supabase Auth user to `agency_admin_users` using the email-based insert statement at the bottom of that migration. Disable public sign-ups in Supabase Auth.

The dashboard deliberately uses only the anon/publishable key. All authorization and row access are enforced by Supabase Auth and RLS policies.