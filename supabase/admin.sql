-- Run once in Supabase > SQL Editor (after schema.sql). Replace the email below with YOUR admin email.
-- Then: Authentication > Users > Add user (that same email + a password), and turn OFF "Allow new users to sign up".
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;
insert into public.admins (email) values ('YOUR_EMAIL_HERE') on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email')) $$;

drop policy if exists "admin read rsvps" on public.rsvps;
drop policy if exists "admin add rsvps" on public.rsvps;
drop policy if exists "admin edit rsvps" on public.rsvps;
drop policy if exists "admin delete rsvps" on public.rsvps;
create policy "admin read rsvps" on public.rsvps for select to authenticated using (public.is_admin());
create policy "admin add rsvps" on public.rsvps for insert to authenticated with check (public.is_admin());
create policy "admin edit rsvps" on public.rsvps for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete rsvps" on public.rsvps for delete to authenticated using (public.is_admin());

create table if not exists public.seating (
  id int primary key default 1 check (id = 1),
  plan jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.seating enable row level security;
drop policy if exists "admin seating" on public.seating;
create policy "admin seating" on public.seating for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.entourage (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table public.entourage enable row level security;
drop policy if exists "public read entourage" on public.entourage;
drop policy if exists "admin write entourage" on public.entourage;
-- Everyone viewing the invitation may read the names; only the admin may change them.
create policy "public read entourage" on public.entourage for select to anon, authenticated using (true);
create policy "admin write entourage" on public.entourage for all to authenticated using (public.is_admin()) with check (public.is_admin());
