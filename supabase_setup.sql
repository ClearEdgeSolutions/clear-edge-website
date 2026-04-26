-- Clear Edge Solutions - Website form intake table
-- Run this in Supabase SQL Editor before testing the forms.

create table if not exists public.website_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  form_name text,
  source_type text not null check (source_type in ('client_contact', 'client_quote', 'partner_application')),
  lead_type text,
  status text not null default 'NEW',
  name text,
  email text,
  phone text,
  service text,
  message text,
  page_path text,
  language text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists website_submissions_created_at_idx on public.website_submissions (created_at desc);
create index if not exists website_submissions_source_type_idx on public.website_submissions (source_type);
create index if not exists website_submissions_status_idx on public.website_submissions (status);

-- For first testing, keep RLS disabled so the Netlify Function can insert.
-- Later, when the dashboard is ready, we can add service-role based policies.
alter table public.website_submissions disable row level security;
