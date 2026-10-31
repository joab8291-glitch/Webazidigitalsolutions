-- ============================================================================
-- Webazi: lock down the `projects` table.   Supabase -> SQL Editor -> paste -> Run
--
-- RUN THIS LAST. Do the steps in SECURITY.md first (admin user created, public
-- sign-ups turned off, website update merged, admin login confirmed working).
--
-- Replace YOUR_ADMIN_EMAIL (appears twice, in the "admin full access" policy).
--
-- Result:
--   * Visitors can only CREATE a "Received" quote with sane values.
--   * Visitors can NOT list, read, edit or delete anything through the API.
--   * The tracker page looks up ONE project by its code through track_project().
--   * Only the admin account can read / edit / delete everything.
-- ============================================================================

begin;

alter table public.projects enable row level security;

-- Remove every existing policy so no old "allow everyone" rule survives.
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'projects' loop
    execute format('drop policy %I on public.projects', r.policyname);
  end loop;
end $$;

revoke all on public.projects from anon, authenticated;
grant insert on public.projects to anon;                                    -- website quote form
grant select, insert, update, delete on public.projects to authenticated;   -- limited to admin by the policy below

-- 1) Visitors: create-only, with limits.
create policy "public can submit a quote" on public.projects
  for insert to anon
  with check (
    status = 'Received'
    and code ~ '^WBZ-[0-9]{4}-[A-Z0-9]{3,12}$'
    and char_length(coalesce(client,''))  between 1 and 80
    and char_length(coalesce(service,'')) <= 80
    and char_length(coalesce(note,''))    <= 200
  );

-- 2) Admin only: tied to ONE email, so even if someone signs up they get nothing.
create policy "admin full access" on public.projects
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL')
  with check ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

-- 3) Tracker: returns ONLY the fields the tracker page shows, for ONE exact code.
create or replace function public.track_project(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'code',    p.code,
           'client',  p.client,
           'service', p.service,
           'status',  p.status,
           'note',    p.note)
  from public.projects p
  where p.code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.track_project(text) from public;
grant execute on function public.track_project(text) to anon, authenticated;

commit;
