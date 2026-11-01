create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  attending boolean not null,
  guests int not null default 1 check (guests between 1 and 10),
  guest_type text not null default 'guest' check (guest_type in ('principal','secondary','guest')),
  companions jsonb not null default '[]',
  message text check (char_length(message) <= 600),
  created_at timestamptz not null default now()
);
alter table public.rsvps enable row level security;
-- Guests (anon) may only add a reply. Read replies in the Supabase dashboard / with the service role.
create policy "guests can reply" on public.rsvps for insert to anon with check (true);
