-- Run once in Supabase > SQL Editor if your rsvps table already exists (adds guest type + companion names).
alter table public.rsvps add column if not exists guest_type text not null default 'guest' check (guest_type in ('principal','secondary','guest'));
alter table public.rsvps add column if not exists companions jsonb not null default '[]';
