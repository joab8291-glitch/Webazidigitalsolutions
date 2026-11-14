-- Webazi Digital Solutions agency operations schema.
-- Run in the existing Webazi Supabase project after creating the intended admin Auth user.
begin;

create table if not exists public.agency_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.agency_admin_users enable row level security;
revoke all on public.agency_admin_users from anon, authenticated;
grant select on public.agency_admin_users to authenticated;
drop policy if exists "admin can view own membership" on public.agency_admin_users;
create policy "admin can view own membership" on public.agency_admin_users
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_agency_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.agency_admin_users a where a.user_id = auth.uid());
$$;
revoke all on function public.is_agency_admin() from public;
grant execute on function public.is_agency_admin() to authenticated;

create table if not exists public.agency_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  business_name text,
  service text not null check (char_length(service) <= 100),
  budget_kes numeric(12,2) check (budget_kes is null or budget_kes >= 0),
  message text check (message is null or char_length(message) <= 3000),
  status text not null default 'New' check (status in ('New','Contacted','Quoted','Converted','Closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.agency_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  email text,
  phone text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.agency_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.agency_clients(id) on delete set null,
  name text not null,
  service text not null,
  description text,
  status text not null default 'Not Started' check (status in ('Not Started','In Progress','Awaiting Client','In Review','Completed','On Hold','Cancelled')),
  budget_kes numeric(12,2) not null default 0 check (budget_kes >= 0),
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.agency_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.agency_projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'To Do' check (status in ('To Do','In Progress','Blocked','Done')),
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  due_date date,
  created_at timestamptz not null default now()
);
create table if not exists public.agency_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid references public.agency_clients(id) on delete set null,
  client_name text not null,
  total_kes numeric(12,2) not null default 0 check (total_kes >= 0),
  status text not null default 'Draft' check (status in ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled')),
  issue_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.agency_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  starting_price_kes numeric(12,2) not null default 0 check (starting_price_kes >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['agency_enquiries','agency_clients','agency_projects','agency_tasks','agency_invoices','agency_services'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "agency admins manage records" on public.%I', t);
    execute format('create policy "agency admins manage records" on public.%I for all to authenticated using (public.is_agency_admin()) with check (public.is_agency_admin())', t);
  end loop;
end $$;

-- Public service catalogue can be read; all writes remain admin-only.
grant select on public.agency_services to anon;
drop policy if exists "public can view active agency services" on public.agency_services;
create policy "public can view active agency services" on public.agency_services
  for select to anon using (active = true);

-- Visitors can submit an enquiry, but cannot read, edit or delete enquiries.
grant insert on public.agency_enquiries to anon;
drop policy if exists "public can submit agency enquiry" on public.agency_enquiries;
create policy "public can submit agency enquiry" on public.agency_enquiries
  for insert to anon with check (
    status = 'New'
    and char_length(name) between 1 and 100
    and (email is null or char_length(email) between 3 and 254)
    and (phone is null or char_length(phone) between 5 and 30)
  );

commit;

-- Add the intended administrator AFTER creating that person in Supabase Auth.
-- Replace the email below with the exact login email, then run this statement:
-- insert into public.agency_admin_users (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_ADMIN_LOGIN_EMAIL');
-- Verify exactly one row was inserted. Keep public Auth sign-ups disabled.
