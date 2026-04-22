-- Migration: create wardrobe_items table
-- Run this in Supabase SQL Editor

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  brand text,
  color text,
  size text,
  image_url text,
  nfc_tag_id text unique,
  created_at timestamptz default now()
);

alter table public.wardrobe_items enable row level security;

create policy "Admin read wardrobe"
  on public.wardrobe_items for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admin insert wardrobe"
  on public.wardrobe_items for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admin delete wardrobe"
  on public.wardrobe_items for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
