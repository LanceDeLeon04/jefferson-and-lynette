-- Entourage list shown on the invitation. Run once in Supabase > SQL Editor (needs admin.sql to have been run first).
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
