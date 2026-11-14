# Webazi Agency Admin

The agency dashboard is built as a separate Vite application but is intended to be opened by staff only through the main website route:

- Public entry point: `https://www.webazi.co.ke/admin` (the apex domain redirects to `www`).
- The main website's Vercel project proxies `/admin` and its static assets to the `webazi-admin` deployment.
- Vite uses `/admin/` as its asset base so scripts and styles load correctly through that route.

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Set the Supabase project URL and anon/publishable key. Never use a service-role key in browser code.
3. Run `npm install` and `npm run dev`.

## Deployment
The `webazi-admin` Vercel project must use this repository with Root Directory `admin-dashboard`, Build Command `npm run build`, and Output Directory `dist`. Add the two `VITE_SUPABASE_*` environment variables. The main website project owns the public `/admin` route.

To honour the single-entry-point requirement, remove `admin.webazi.co.ke` and the public `webazi-admin.vercel.app` alias from the admin Vercel project after the main-domain proxy has been verified. The Vercel management connection used for this repository does not expose a project-domain removal action, so those aliases must be detached in the Vercel dashboard.

## Database and access control
Apply `../supabase/migrations/20261114_agency_admin.sql` in the existing Webazi Supabase project's SQL Editor. Create the intended administrator Auth user for `info@webazi.co.ke`, then run the membership block at the bottom of the migration. Keep public Auth sign-ups disabled.

The dashboard checks membership in `agency_admin_users` after sign-in. All agency records are protected by Supabase Row Level Security; the browser uses only the anon/publishable key. Never expose a service-role key.
