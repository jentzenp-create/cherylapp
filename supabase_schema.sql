-- =============================================
-- Therapy Practice App — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- =============================================
-- CLIENTS
-- =============================================
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

-- =============================================
-- SESSIONS
-- =============================================
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_client_id_idx on sessions(client_id);

-- =============================================
-- MANUALS
-- =============================================
create table if not exists manuals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  cover_color text,
  created_at timestamptz not null default now()
);

-- =============================================
-- MANUAL SECTIONS
-- =============================================
create table if not exists manual_sections (
  id uuid primary key default uuid_generate_v4(),
  manual_id uuid not null references manuals(id) on delete cascade,
  chapter text not null,
  title text not null,
  content text not null default '',
  order_idx integer not null default 0,
  image_urls text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists manual_sections_manual_id_idx on manual_sections(manual_id);
create index if not exists manual_sections_order_idx on manual_sections(manual_id, order_idx);

-- =============================================
-- ANNOTATIONS
-- =============================================
create table if not exists annotations (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references manual_sections(id) on delete cascade,
  type text not null check (type in ('highlight', 'note')),
  scope text not null check (scope in ('client', 'global')),
  client_id uuid references clients(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  content text,
  exact_text text,
  position_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists annotations_section_id_idx on annotations(section_id);
create index if not exists annotations_client_id_idx on annotations(client_id);
create index if not exists annotations_scope_idx on annotations(scope);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS on all tables — only authenticated users can access data
alter table clients enable row level security;
alter table sessions enable row level security;
alter table manuals enable row level security;
alter table manual_sections enable row level security;
alter table annotations enable row level security;

-- Policy: any authenticated user (the single practitioner) can do anything
create policy "Authenticated full access" on clients
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on sessions
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on manuals
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on manual_sections
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on annotations
  for all using (auth.role() = 'authenticated');

-- =============================================
-- STORAGE BUCKET for manual images
-- =============================================
-- Run this separately or via Supabase dashboard:
-- Create a bucket called "manual-images" and set it to public read.
-- insert into storage.buckets (id, name, public) values ('manual-images', 'manual-images', true);

-- =============================================
-- DONE
-- =============================================
