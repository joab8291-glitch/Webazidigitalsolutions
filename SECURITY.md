# Webazi website security — setup order and checks

This file is not served on the website (blocked in `vercel.json`).

## What changed in this update
- **Admin login is now real.** The old login ran in the browser and the default password was in the page source. It now uses Supabase Auth (email + password); the server decides who is the admin.
- **Stored-XSS fixed.** Anything a visitor typed (name, service) was injected raw into the admin dashboard. All values are now escaped.
- **Project codes are unguessable** (`WBZ-2026-K7M3QX`, not `WBZ-2026-482`).
- **Tracker** asks the database for one project by exact code (`track_project`) instead of reading the whole table.
- **Headers:** Content-Security-Policy, HSTS, Permissions-Policy, COOP, no-store on admin, X-XSS-Protection off (deprecated).
- `rel="noopener noreferrer"` on external links; `/.well-known/security.txt` added; internal files blocked from the public site.

## Do these in order (nothing breaks if you follow the order)
1. **Supabase → Authentication → Users → Add user**: your admin email + a long unique password (12+ chars, password manager). Tick "Auto confirm".
2. **Supabase → Authentication → Sign In / Providers**: turn **OFF "Allow new users to sign up"**.
3. **Merge the pull request.** Open `/admin`, log in with the new email + password. The old default password no longer works.
4. **Supabase → SQL Editor**: open `supabase/security.sql`, replace `YOUR_ADMIN_EMAIL` (twice), Run.
5. Check:
   - Admin still loads projects, edits and deletes.
   - The tracker finds a project with a real code.
   - The website quote form still creates a project.
   - From any browser, this must return `[]` or an error (not data):
     `https://ezyvuipabbhckplhlvxz.supabase.co/rest/v1/projects?select=*&apikey=<anon key from the site source>`

## Also do (accounts, not code)
- Turn on **2-factor authentication** on GitHub, Vercel, Supabase, Truehost and your Google account.
- **GitHub → Settings → Branches**: protect `main` (require a pull request).
- **Vercel → Firewall**: enable bot protection and add a rate-limit rule; keep **Attack Challenge Mode** ready to switch on if you are ever attacked.
- **DNS:** DMARC exists (`p=quarantine`). Also confirm SPF and DKIM at Truehost, and add a CAA record.
- **Third-party scripts:** pin `@supabase/supabase-js` to an exact version and add an `integrity=` hash (and the same for Font Awesome).
