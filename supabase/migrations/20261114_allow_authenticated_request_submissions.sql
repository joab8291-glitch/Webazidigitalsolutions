-- Allow request submissions from both public visitors and browsers with an existing Supabase session.
-- Customers still cannot read or manage requests; authenticated inbox access remains admin-only.
begin;
grant insert on table public.agency_chat_requests to anon, authenticated;
drop policy if exists "public can submit customer requests" on public.agency_chat_requests;
create policy "public can submit customer requests"
 on public.agency_chat_requests
 for insert
 to anon, authenticated
 with check (
   status = 'New'
   and char_length(name) between 1 and 100
   and char_length(phone) between 7 and 30
   and (email is null or char_length(email) <= 254)
   and char_length(service) between 1 and 100
   and char_length(message) between 5 and 3000
 );
commit;
