-- Public customer requests. No customer accounts are required.
begin;
create table if not exists public.agency_chat_requests (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 100),
 phone text not null check (char_length(phone) between 7 and 30),
 email text check (email is null or char_length(email) <= 254),
 service text not null check (char_length(service) between 1 and 100),
 message text not null check (char_length(message) between 5 and 3000),
 admin_reply text check (admin_reply is null or char_length(admin_reply) <= 3000),
 status text not null default 'New' check (status in ('New','In Progress','Replied','Closed')),
 created_at timestamptz not null default now(),
 replied_at timestamptz
);
alter table public.agency_chat_requests enable row level security;
revoke all on public.agency_chat_requests from anon, authenticated;
grant insert on public.agency_chat_requests to anon;
grant select, update, delete on public.agency_chat_requests to authenticated;
drop policy if exists "public can submit customer requests" on public.agency_chat_requests;
create policy "public can submit customer requests" on public.agency_chat_requests
 for insert to anon with check (status='New' and char_length(name) between 1 and 100 and char_length(phone) between 7 and 30 and char_length(service) between 1 and 100 and char_length(message) between 5 and 3000);
drop policy if exists "agency admins manage customer requests" on public.agency_chat_requests;
create policy "agency admins manage customer requests" on public.agency_chat_requests
 for all to authenticated using (public.is_agency_admin()) with check (public.is_agency_admin());
commit;
